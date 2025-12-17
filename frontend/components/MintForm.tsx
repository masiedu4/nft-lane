
'use client';

import { useState } from 'react';
import { sendMintTransaction, MintData } from '@/lib/lane-client';
import { Loader2, CheckCircle, AlertCircle, Terminal } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Default dev key for convenience
const DEFAULT_KEY = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';

export default function MintForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; hash?: string; error?: string } | null>(null);
  
  // Form State
  const [tokenId, setTokenId] = useState('');
  const [owner, setOwner] = useState('');
  const [metadataJson, setMetadataJson] = useState('{\n  "name": "My NFT",\n  "description": "Minted on Derived Lane"\n}');
  const [privateKey, setPrivateKey] = useState(DEFAULT_KEY);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      let metadata = {};
      try {
        metadata = JSON.parse(metadataJson);
      } catch (err) {
        throw new Error('Invalid JSON in metadata field');
      }

      const data: MintData = {
        metadata,
      };
      
      if (tokenId.trim()) data.token_id = tokenId.trim();
      if (owner.trim()) data.owner = owner.trim();

      // Ensure private key starts with 0x if not empty
      let key = privateKey.trim();
      if (!key.startsWith('0x')) key = `0x${key}`;

      const res = await sendMintTransaction(data, key as `0x${string}`);
      setResult(res);
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="token_id" className="text-sm font-medium text-neutral-300">
              Token ID <span className="text-neutral-500">(Optional)</span>
            </label>
            <input
              id="token_id"
              type="text"
              placeholder="Auto-generated if empty"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 placeholder:text-neutral-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label htmlFor="owner" className="text-sm font-medium text-neutral-300">
              Owner <span className="text-neutral-500">(Optional)</span>
            </label>
            <input
              id="owner"
              type="text"
              placeholder="Address or name"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 placeholder:text-neutral-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="metadata" className="text-sm font-medium text-neutral-300">
            Metadata JSON
          </label>
          <textarea
            id="metadata"
            rows={5}
            value={metadataJson}
            onChange={(e) => setMetadataJson(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 font-mono text-sm placeholder:text-neutral-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="border-t border-neutral-800 pt-4 mt-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="private_key" className="text-sm font-medium text-neutral-300 flex items-center justify-between">
              <span>Signer Private Key</span>
              <span className="text-xs text-neutral-500 font-normal">Default: Anvil Account #2</span>
            </label>
            <div className="relative">
              <input
                id="private_key"
                type="password"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 pr-10 text-neutral-100 font-mono text-xs placeholder:text-neutral-600 focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3 px-6 rounded-lg transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin w-5 h-5" />
              Processing Transaction...
            </>
          ) : (
            'Mint NFT'
          )}
        </button>
      </form>

      {/* Results Display */}
      {result && (
        <div className={cn(
          "mt-6 p-4 rounded-lg border flex flex-col gap-2 animate-in fade-in slide-in-from-top-2",
          result.success ? "bg-green-500/10 border-green-500/20 text-green-200" : "bg-red-500/10 border-red-500/20 text-red-200"
        )}>
          <div className="flex items-center gap-2 font-medium">
            {result.success ? <CheckCircle className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
            {result.success ? 'Transaction Sent Successfully' : 'Transaction Failed'}
          </div>
          
          {result.success && result.hash && (
            <div className="text-xs font-mono break-all bg-black/20 p-2 rounded mt-1">
              Hash: {result.hash}
            </div>
          )}
          
          {!result.success && result.error && (
            <div className="text-sm mt-1 opacity-90">
              {result.error}
            </div>
          )}

          {result.success && (
            <div className="mt-2 text-xs text-neutral-400 flex items-center gap-1">
              <Terminal className="w-3 h-3" />
              Check your terminal logs for execution confirmation.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
