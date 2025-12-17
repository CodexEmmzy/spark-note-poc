import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button, Input, Card, CardHeader, CardBody, CodeBlock, Badge, ToastContainer, WorkflowProgress } from './components';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useToast } from './hooks/useToast';
import './App.css';

// Types matching the SDK
interface SparkNote {
  value: bigint;
  secret: Uint8Array;
  commitment: Uint8Array;
}

// WASM Module interface
interface WasmModule {
  createNote(value: bigint, secret: Uint8Array): {
    value: bigint;
    secret: Uint8Array;
    commitment: Uint8Array;
    free(): void;
  };
  generateNullifier(note: { value: bigint; secret: Uint8Array; commitment: Uint8Array }, secret: Uint8Array): Uint8Array;
  isNullifierSpent(nullifier: Uint8Array, spentSet: Uint8Array[]): boolean;
}

type FlowStep = 'idle' | 'created' | 'nullifier' | 'spent' | 'verified';

// Global promise to prevent multiple simultaneous WASM loads
let wasmLoadPromise: Promise<WasmModule | null> | null = null;

function App() {
  const [wasm, setWasm] = useState<WasmModule | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const isMountedRef = useRef(true);
  const hasRestoredRef = useRef(false);
  const isRestoringRef = useRef(false);

  // Form state
  const [noteValue, setNoteValue] = useState('1000');
  const [secretHex, setSecretHex] = useState('');

  // Note state
  const [currentNote, setCurrentNote] = useState<SparkNote | null>(null);
  const [currentNullifier, setCurrentNullifier] = useState<Uint8Array | null>(null);
  const [spentNullifiers, setSpentNullifiers] = useState<Uint8Array[]>([]);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);

  // Flow tracking
  const [flowStep, setFlowStep] = useState<FlowStep>('idle');
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize WASM - only once, using a global promise to prevent multiple loads
  useEffect(() => {
    isMountedRef.current = true;

    async function loadWasm() {
      // If already loaded in this component, skip
      if (wasm) {
        return;
      }

      // If there's already a load in progress, wait for it
      if (wasmLoadPromise) {
        try {
          const existingModule = await wasmLoadPromise;
          if (isMountedRef.current) {
            setWasm(existingModule);
            setLoading(false);
          }
          return;
        } catch (err) {
          // If the existing load failed, we'll try our own
          wasmLoadPromise = null;
        }
      }

      // Start a new load
      wasmLoadPromise = (async () => {
        try {
          if (!isMountedRef.current) return null;
          setLoading(true);

          // Fetch the JS glue code
          const jsResponse = await fetch('/wasm/spark_note_core.js');
          if (!jsResponse.ok) {
            throw new Error(`Failed to fetch WASM JS: ${jsResponse.status}`);
          }
          
          const jsCode = await jsResponse.text();

          // Create a blob URL for the JS code
          const blob = new Blob([jsCode], { type: 'application/javascript' });
          const blobUrl = URL.createObjectURL(blob);
          
          try {
            // Import the module from the blob URL
            const wasmModule = await import(/* @vite-ignore */ blobUrl);
            
            // Initialize WASM - wasm-bindgen's init function prevents duplicate initialization
            if (wasmModule.default && typeof wasmModule.default === 'function') {
        await wasmModule.default('/wasm/spark_note_core_bg.wasm');
            }
            
            return wasmModule as unknown as WasmModule;
          } finally {
            // Clean up the blob URL
            URL.revokeObjectURL(blobUrl);
          }
        } catch (err) {
          console.error('WASM load error:', err);
          wasmLoadPromise = null; // Allow retry on next mount
          throw err;
        }
      })();

      try {
        const loadedModule = await wasmLoadPromise;
        if (!isMountedRef.current) return;
        
        if (loadedModule) {
          setWasm(loadedModule);
        setLoading(false);
          // Use toast callback to avoid dependency
          toast.success('WASM module loaded successfully');
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        const errorMessage = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to load WASM: ${errorMessage}`);
        setLoading(false);
      }
    }

    loadWasm();

    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount, toast is stable

  // Load persisted state after WASM is ready (only once)
  // NOTE: Secrets are NOT restored for security - they are stored in memory only
  useEffect(() => {
    if (!wasm || loading || hasRestoredRef.current || isRestoringRef.current) return;

    isRestoringRef.current = true;
    hasRestoredRef.current = true;

    // Load persisted state (public data only - no secrets)
    const savedNullifier = loadNullifier();
    const savedSpent = loadSpentNullifiers();
    const savedFlowStep = loadFromStorage(STORAGE_KEYS.FLOW_STEP) as FlowStep | null;
    const savedNoteValue = loadFromStorage(STORAGE_KEYS.NOTE_VALUE);
    // NOTE: We don't restore savedSecretHex for security

    let hasRestoredData = false;

    // Note: We don't restore savedNote because it requires a secret
    // User must recreate notes after page refresh (this is intentional for security)

    if (savedNullifier) {
      setCurrentNullifier(savedNullifier);
      hasRestoredData = true;
    }
    if (savedSpent.length > 0) {
      setSpentNullifiers(savedSpent);
      hasRestoredData = true;
    }
    if (savedFlowStep && ['idle', 'created', 'nullifier', 'spent', 'verified'].includes(savedFlowStep)) {
      setFlowStep(savedFlowStep);
    }
    if (savedNoteValue) {
      setNoteValue(savedNoteValue);
    }
    // Don't restore secretHex - user must regenerate for security

    // Show toast only once, after a small delay to avoid conflicts
    if (hasRestoredData) {
      setTimeout(() => {
        toast.info('Previous session partially restored (secrets not stored for security)');
      }, 100);
    }

    isRestoringRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wasm, loading]); // Removed toast from deps - it's stable

  // Memoize note list to prevent unnecessary re-renders
  const noteList = useMemo(() => {
    return spentNullifiers.map((n, i) => ({
      id: i,
      nullifier: n,
      hex: arrayToHex(n),
    }));
  }, [spentNullifiers]);

  // Persist state changes (skip during initial restore)
  useEffect(() => {
    if (!wasm || loading || isRestoringRef.current) return;
    saveNote(currentNote);
  }, [currentNote, wasm, loading]);

  useEffect(() => {
    if (!wasm || loading || isRestoringRef.current) return;
    saveNullifier(currentNullifier);
  }, [currentNullifier, wasm, loading]);

  useEffect(() => {
    if (!wasm || loading || isRestoringRef.current) return;
    saveSpentNullifiers(spentNullifiers);
  }, [spentNullifiers, wasm, loading]);

  useEffect(() => {
    if (!wasm || loading || isRestoringRef.current) return;
    saveToStorage(STORAGE_KEYS.FLOW_STEP, flowStep);
  }, [flowStep, wasm, loading]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.NOTE_VALUE, noteValue || null);
  }, [noteValue]);

  // SECURITY: Do not persist secrets in localStorage
  // Secret hex is stored in memory only
  // useEffect(() => {
  //   saveToStorage(STORAGE_KEYS.SECRET_HEX, secretHex || null);
  // }, [secretHex]);

  // Generate random secret
  const generateSecret = useCallback(() => {
    const secret = new Uint8Array(32);
    crypto.getRandomValues(secret);
    setSecretHex(arrayToHex(secret));
    toast.info('Secret generated');
  }, [toast]);

  // Create note
  const handleCreateNote = useCallback(() => {
    if (!wasm) {
      toast.warning('WASM module not ready');
      return;
    }

    try {
      setIsCreating(true);
      const valueNum = Number(noteValue);
      if (isNaN(valueNum) || valueNum <= 0 || !Number.isInteger(valueNum)) {
        toast.error('Value must be a positive integer');
        setIsCreating(false);
        return;
      }

      const value = BigInt(noteValue);
      const secret = hexToArray(secretHex);

      if (secret.length === 0) {
        toast.error('Please generate or enter a secret');
        setIsCreating(false);
        return;
      }

      if (secret.length < 8) {
        toast.error('Secret must be at least 8 bytes (16 hex characters)');
        setIsCreating(false);
        return;
      }

      const wasmNote = wasm.createNote(value, secret);
      const note: SparkNote = {
        value: wasmNote.value,
        secret: new Uint8Array(wasmNote.secret),
        commitment: new Uint8Array(wasmNote.commitment),
      };
      wasmNote.free();

      setCurrentNote(note);
      setCurrentNullifier(null);
      setVerificationResult(null);
      setFlowStep('created');
      toast.success('Note created successfully');
    } catch (err) {
      toast.error(`Failed to create note: ${err}`);
    } finally {
      setIsCreating(false);
    }
  }, [wasm, noteValue, secretHex, toast]);

  // Generate nullifier
  const handleGenerateNullifier = useCallback(() => {
    if (!wasm || !currentNote) return;

    try {
      setIsGenerating(true);
      const wasmNote = wasm.createNote(currentNote.value, currentNote.secret);
      const nullifier = wasm.generateNullifier(wasmNote, currentNote.secret);
      wasmNote.free();

      setCurrentNullifier(new Uint8Array(nullifier));
      setVerificationResult(null);
      setFlowStep('nullifier');
      toast.success('Nullifier generated');
    } catch (err) {
      toast.error(`Failed to generate nullifier: ${err}`);
    } finally {
      setIsGenerating(false);
    }
  }, [wasm, currentNote, toast]);

  // Mark as spent
  const handleMarkSpent = useCallback(() => {
    if (!currentNullifier) return;

    setSpentNullifiers(prev => [...prev, currentNullifier]);
    setFlowStep('spent');
    toast.success('Nullifier marked as spent');
  }, [currentNullifier, toast]);

  // Verify nullifier
  const handleVerify = useCallback(() => {
    if (!wasm || !currentNullifier) return;

    try {
      const isSpent = wasm.isNullifierSpent(currentNullifier, spentNullifiers);
      setVerificationResult(isSpent);
      setFlowStep('verified');
      if (isSpent) {
        toast.info('Nullifier verification: Already spent');
      } else {
        toast.success('Nullifier verification: Not spent');
      }
    } catch (err) {
      toast.error(`Failed to verify: ${err}`);
    }
  }, [wasm, currentNullifier, spentNullifiers, toast]);

  // Reset everything
  const handleReset = useCallback(() => {
    setCurrentNote(null);
    setCurrentNullifier(null);
    setVerificationResult(null);
    setFlowStep('idle');
    // Clear persisted state
    saveNote(null);
    saveNullifier(null);
    saveToStorage(STORAGE_KEYS.FLOW_STEP, 'idle');
    toast.info('Workflow reset');
  }, [toast]);

  // Clear spent nullifiers
  const handleClearSpent = useCallback(() => {
    setSpentNullifiers([]);
    saveSpentNullifiers([]);
    toast.info('Spent nullifiers cleared');
  }, [toast]);

  return (
    <ErrorBoundary>
    <div className="app">
        <header className="app-header">
        <div className="app-header__content">
          <h1 className="app-title">Spark Note</h1>
          <p className="app-subtitle">Privacy-preserving transaction protocol demonstration</p>
          <div className="app-status">
            <Badge variant={loading ? 'warning' : wasm ? 'success' : 'danger'} dot>
              {loading ? 'Initializing' : wasm ? 'Ready' : 'Error'}
            </Badge>
          </div>
        </div>
      </header>

      <main className="app-main">
        <WorkflowProgress currentStep={flowStep} />

        <div className="app-grid">
        {/* Create Note Card */}
          <Card variant="elevated" padding="lg">
            <CardHeader
              icon="N"
              title="Create Note"
              subtitle="Generate a new Spark note with value and secret"
            />
            <CardBody>
              <div className="form-grid">
                <Input
                  label="Value"
              type="number"
              value={noteValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (Number(val) > 0 && Number.isInteger(Number(val)))) {
                      setNoteValue(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateNote();
                    }
                  }}
                  placeholder="1000"
                  min="1"
                  step="1"
                  hint="Enter the note value in satoshis"
                />
                <Input
                  label="Secret"
              type="text"
              value={secretHex}
              onChange={(e) => setSecretHex(e.target.value)}
                  placeholder="0x..."
                  hint="Hex-encoded secret (min 16 characters)"
                  rightIcon={
                    <button
                      type="button"
                      onClick={generateSecret}
                      className="input-icon-button"
                      aria-label="Generate random secret"
                      title="Generate random secret"
                    >
                      <span aria-hidden="true">🎲</span>
                    </button>
                  }
            />
          </div>
              <div className="button-group">
                <Button variant="secondary" onClick={generateSecret} size="md">
                  Generate Secret
                </Button>
                <Button
                  variant="primary"
              onClick={handleCreateNote}
                  disabled={loading || !wasm || isCreating}
                  isLoading={isCreating}
                  size="md"
            >
              Create Note
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Note Details Card */}
          <Card variant="elevated" padding="lg">
            <CardHeader
              icon="D"
              title="Note Details"
              subtitle="Cryptographic commitment and note information"
            />
            <CardBody>
              {currentNote ? (
                <div className="data-display">
                  <div className="data-item">
                    <div className="data-item__label">Value</div>
                    <div className="data-item__value">{currentNote.value.toLocaleString()} sats</div>
              </div>
                  <CodeBlock
                    value={arrayToHex(currentNote.commitment)}
                    label="Commitment Hash"
                    variant="commitment"
                    maxLength={64}
                  />
                  <div className="button-group">
                    <Button
                      variant="primary"
                  onClick={handleGenerateNullifier}
                      disabled={isGenerating}
                      isLoading={isGenerating}
                      size="md"
                >
                  Generate Nullifier
                    </Button>
                    <Button variant="ghost" onClick={handleReset} size="md">
                  Reset
                    </Button>
                  </div>
              </div>
          ) : (
            <div className="empty-state">
                  <p>Create a note to view details</p>
            </div>
          )}
            </CardBody>
          </Card>

        {/* Nullifier Card */}
          <Card variant="elevated" padding="lg">
            <CardHeader
              icon="H"
              title="Nullifier"
              subtitle="Spending identifier and verification"
            />
            <CardBody>
          {currentNullifier ? (
                <div className="data-display">
                  <CodeBlock
                    value={arrayToHex(currentNullifier)}
                    label="Nullifier Hash"
                    variant="nullifier"
                    maxLength={64}
                  />
                  <div className="button-group">
                    <Button variant="warning" onClick={handleMarkSpent} size="md">
                  Mark as Spent
                    </Button>
                    <Button variant="secondary" onClick={handleVerify} size="md">
                      Verify Status
                    </Button>
              </div>
              {verificationResult !== null && (
                    <div className={`verification-badge verification-badge--${verificationResult ? 'spent' : 'unspent'}`}>
                      <Badge variant={verificationResult ? 'danger' : 'success'} dot>
                        {verificationResult ? 'Spent' : 'Unspent'}
                      </Badge>
                    </div>
                  )}
                </div>
          ) : (
            <div className="empty-state">
                  <p>Generate a nullifier to view details</p>
            </div>
          )}
            </CardBody>
          </Card>

        {/* Spent Nullifiers Card */}
          <Card variant="elevated" padding="lg">
            <CardHeader
              icon="S"
              title="Spent Nullifiers"
              subtitle={`${spentNullifiers.length} tracked`}
              action={
                spentNullifiers.length > 0 && (
                  <Button variant="ghost" onClick={handleClearSpent} size="sm">
                    Clear
                  </Button>
                )
              }
            />
            <CardBody>
          {spentNullifiers.length > 0 ? (
              <div className="nullifier-list">
                  {noteList.map((item) => (
                    <div key={item.id} className="nullifier-item">
                      <CodeBlock
                        value={item.hex}
                        variant="nullifier"
                        maxLength={48}
                      />
                  </div>
                ))}
              </div>
          ) : (
            <div className="empty-state">
              <p>No spent nullifiers yet</p>
            </div>
          )}
            </CardBody>
          </Card>
        </div>
      </main>

      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      </div>
    </ErrorBoundary>
  );
}

// Storage keys
const STORAGE_KEYS = {
  CURRENT_NOTE: 'spark_note_current_note',
  CURRENT_NULLIFIER: 'spark_note_current_nullifier',
  SPENT_NULLIFIERS: 'spark_note_spent_nullifiers',
  FLOW_STEP: 'spark_note_flow_step',
  NOTE_VALUE: 'spark_note_value',
  SECRET_HEX: 'spark_note_secret_hex',
} as const;

// Utility functions for serialization
function arrayToHex(arr: Uint8Array): string {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToArray(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, '').replace(/\s/g, '');
  if (clean.length === 0) return new Uint8Array(0);
  if (!/^[0-9a-fA-F]+$/.test(clean)) return new Uint8Array(0);
  if (clean.length % 2 !== 0) return new Uint8Array(0);
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(clean.substr(i * 2, 2), 16);
    if (isNaN(byte)) return new Uint8Array(0);
    bytes[i] = byte;
  }
  return bytes;
}

function arrayToBase64(arr: Uint8Array): string {
  const binary = String.fromCharCode(...arr);
  return btoa(binary);
}

function base64ToArray(base64: string): Uint8Array {
  try {
    const binary = atob(base64);
    return new Uint8Array(binary.split('').map(c => c.charCodeAt(0)));
  } catch {
    return new Uint8Array(0);
  }
}

// Persistence functions
function saveToStorage(key: string, value: string | null) {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch (err) {
    console.warn('Failed to save to localStorage:', err);
  }
}

function loadFromStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn('Failed to load from localStorage:', err);
    return null;
  }
}

// SECURITY: Do not persist secrets in localStorage
// Only store public data (value and commitment)
function saveNote(note: SparkNote | null) {
  if (!note) {
    saveToStorage(STORAGE_KEYS.CURRENT_NOTE, null);
    return;
  }
  // Only store public fields - never store secrets
  const serialized = JSON.stringify({
    value: note.value.toString(),
    commitment: arrayToBase64(note.commitment),
    // NOTE: secret is intentionally NOT stored for security
  });
  saveToStorage(STORAGE_KEYS.CURRENT_NOTE, serialized);
}

// SECURITY: Notes are not restored from storage because secrets are never stored
// This function is intentionally not used - secrets must never be persisted

function saveNullifier(nullifier: Uint8Array | null) {
  if (!nullifier) {
    saveToStorage(STORAGE_KEYS.CURRENT_NULLIFIER, null);
    return;
  }
  saveToStorage(STORAGE_KEYS.CURRENT_NULLIFIER, arrayToBase64(nullifier));
}

function loadNullifier(): Uint8Array | null {
  const stored = loadFromStorage(STORAGE_KEYS.CURRENT_NULLIFIER);
  if (!stored) return null;
  const arr = base64ToArray(stored);
  return arr.length > 0 ? arr : null;
}

function saveSpentNullifiers(nullifiers: Uint8Array[]) {
  const serialized = JSON.stringify(nullifiers.map(n => arrayToBase64(n)));
  saveToStorage(STORAGE_KEYS.SPENT_NULLIFIERS, serialized);
}

function loadSpentNullifiers(): Uint8Array[] {
  const stored = loadFromStorage(STORAGE_KEYS.SPENT_NULLIFIERS);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as string[];
    return parsed.map(base64ToArray).filter(arr => arr.length > 0);
  } catch {
    return [];
  }
}

export default App;
