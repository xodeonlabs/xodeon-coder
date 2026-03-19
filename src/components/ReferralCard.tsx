import { useReferral } from '@/hooks/useReferral';
import { Copy, Gift, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ReferralCardProps {
  userId: string | undefined;
}

export function ReferralCard({ userId }: ReferralCardProps) {
  const {
    referralCode,
    totalRewards,
    referredUsers,
    loading,
    error,
    generateReferralCode,
    useReferralCode,
  } = useReferral(userId);

  const [copied, setCopied] = useState(false);
  const [showUseCode, setShowUseCode] = useState(false);
  const [inputCode, setInputCode] = useState('');

  const handleCopy = async () => {
    if (referralCode) {
      await navigator.clipboard.writeText(referralCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUseCode = async () => {
    const success = await useReferralCode(inputCode);
    if (success) {
      setInputCode('');
      setShowUseCode(false);
    }
  };

  const shareUrl = referralCode
    ? `${window.location.origin}?referral=${referralCode.code}`
    : '';

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">👥 Referral Program</h3>
        <p className="text-sm text-muted-foreground">
          Nodig vrienden uit en verdien samen coins!
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-primary/10 p-3 text-center">
          <p className="text-2xl font-bold text-primary">{referredUsers}</p>
          <p className="text-xs text-muted-foreground">Referred</p>
        </div>
        <div className="rounded-lg bg-green-500/10 p-3 text-center">
          <p className="text-2xl font-bold text-green-600">+{totalRewards}</p>
          <p className="text-xs text-muted-foreground">Earned</p>
        </div>
        <div className="rounded-lg bg-blue-500/10 p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">+50</p>
          <p className="text-xs text-muted-foreground">Per Ref</p>
        </div>
      </div>

      {/* Generate/Share Code */}
      {referralCode ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-boundary/50">
            <code className="flex-1 font-mono font-bold">{referralCode.code}</code>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title={copied ? 'Copied!' : 'Copy'}
            >
              <Copy className={`h-4 w-4 ${copied ? 'text-green-600' : 'text-muted-foreground'}`} />
            </button>
          </div>

          <button
            onClick={() => {
              const text = `Join me on Xodeon! Use my referral code: ${referralCode.code}`;
              navigator.share?.({
                title: 'Xodeon Referral',
                text,
              });
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Share Code
          </button>
        </div>
      ) : (
        <button
          onClick={() => generateReferralCode()}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Gift className="h-4 w-4" />
          {loading ? 'Generating...' : 'Generate Referral Code'}
        </button>
      )}

      {/* Use Code */}
      <div className="border-t border-border/50 pt-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">Have a referral code?</h4>
        {showUseCode ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              placeholder="Paste code here"
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleUseCode}
              disabled={!inputCode}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              Use
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowUseCode(true)}
            className="w-full text-sm text-primary hover:underline"
          >
            Enter referral code
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
