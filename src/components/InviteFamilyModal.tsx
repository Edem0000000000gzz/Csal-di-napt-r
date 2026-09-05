import React, { useState, useEffect } from 'react';
import {
  X,
  Link2,
  Copy,
  Check,
  Share2,
  Users,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  LogOut,
  Info,
  Key,
  AlertTriangle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import {
  buildFamilyInviteLink,
  getActiveFamilyAccessKey,
  rotateFamilyAccessKey,
} from '../utils/syncService';

interface InviteFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string | null;
  onGenerateNewFamily: () => void;
  onLeaveFamily: () => void;
  onJoinFamily?: (customFamilyId: string) => void;
  eventsCount: number;
  shiftsCount: number;
}

export const InviteFamilyModal: React.FC<InviteFamilyModalProps> = ({
  isOpen,
  onClose,
  familyId,
  onGenerateNewFamily,
  onLeaveFamily,
  onJoinFamily,
  eventsCount,
  shiftsCount,
}) => {
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [activeKey, setActiveKey] = useState<string>(() => getActiveFamilyAccessKey());
  const [isRotating, setIsRotating] = useState(false);
  const [rotateMessage, setRotateMessage] = useState<string | null>(null);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [expiryOption, setExpiryOption] = useState<number>(0); // 0 = never, 7 = 7 days, 30 = 30 days
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveKey(getActiveFamilyAccessKey());
      setRotateMessage(null);
      setRotateError(null);
      setJoinError(null);
      setJoinCodeInput('');
    }
  }, [isOpen, familyId]);

  if (!isOpen) return null;

  const inviteLink = familyId ? buildFamilyInviteLink(familyId) : '';

  const handleCopyCode = async () => {
    if (!familyId) return;
    try {
      await navigator.clipboard.writeText(familyId);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    } catch {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCodeInput.trim();
    if (!clean) {
      setJoinError('Kérlek adj meg egy családi kódot.');
      return;
    }
    if (clean.length < 3) {
      setJoinError('A családi kód legalább 3 karakterből áll.');
      return;
    }
    if (onJoinFamily) {
      onJoinFamily(clean);
      onClose();
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = inviteLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (!inviteLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Családi Naptár – Privát Meghívó Link',
          text: 'Csatlakozz a közös családi naptárunkhoz ezen a linken keresztül!',
          url: inviteLink,
        });
      } catch {
        // User cancelled or not supported
      }
    } else {
      handleCopyLink();
    }
  };

  const handleRevokeAndRotateKey = async () => {
    if (!familyId) return;
    let confirmRevoke = true;
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        confirmRevoke = window.confirm(
          'BIZTOSAN VISSZAVONOD A JELENLEGI MEGHÍVÓT ÉS KULCSOT?\n\n' +
            '• Minden eddig megosztott link AZONNAL érvénytelenné válik.\n' +
            '• Külső személyek, akik korábban megszerezték a linket, többé nem férhetnek hozzá.\n' +
            '• A családtagoknak át kell küldened az új linket.'
        );
      }
    } catch {
      confirmRevoke = true;
    }
    if (!confirmRevoke) return;

    setIsRotating(true);
    setRotateMessage(null);
    setRotateError(null);

    const currentKey = activeKey || getActiveFamilyAccessKey();
    const res = await rotateFamilyAccessKey(familyId, currentKey, expiryOption > 0 ? expiryOption : undefined);
    setIsRotating(false);

    if (res.success && res.newKey) {
      setActiveKey(res.newKey);
      setRotateMessage('A korábbi meghívó link visszavonva! Sikeresen generáltunk új hozzáférési kulcsot.');
      setTimeout(() => setRotateMessage(null), 8000);
    } else {
      setRotateError(res.error || 'Nem sikerült visszavonni a kulcsot.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Családtagok meghívása privát linkkel
              </h3>
              <p className="text-[11px] text-slate-400">
                Közös naptár és szülői munkaidő valós időben
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status Explanation */}
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/60 space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Hogyan működik a közös megosztás?</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Küldd el ezt az egyedi privát linket a családtagjaidnak (pl. WhatsAppon, Messengeren vagy SMS-ben).
            </p>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-slate-200">Közös naptár:</strong> Aki megnyitja ezt a linket a telefonján vagy gépén, azonnal ugyanazt a naptárat látja, és bármelyikőtök ír be eseményt vagy munkaidőt, mindenkinél frissül.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-slate-200">Teljes adatvédelem:</strong> Bárki, aki a link nélkül tölti le vagy nyitja meg az alkalmazást, továbbra is egy teljesen üres, különálló appot kap.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-slate-200">Szerveroldali BOLA-védelem:</strong> A családi naptárat 256 bites kriptográfiai hozzáférési kulcs védi. Egy másik szoba tagja vagy külső fél az azonosító ismeretében sem tudja lekérni vagy módosítani az adataitokat.
                </span>
              </div>
            </div>
          </div>

          {/* If No Family Created Yet */}
          {!familyId ? (
            <div className="text-center py-6 px-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-white">
                  Még nincs aktív privát családi linked
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Kattints az alábbi gombra a privát meghívó link azonnali létrehozásához.
                </p>
              </div>
              <button
                type="button"
                onClick={onGenerateNewFamily}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                Privát családi link generálása
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Active Room Badge & Quick Code Copy */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-slate-850 border border-slate-800 text-xs gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-slate-300">Családi Kódod:</span>
                  <code className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs font-bold">
                    {familyId}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition cursor-pointer"
                  >
                    {codeCopied ? 'Kód másolva!' : 'Kód másolása'}
                  </button>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {eventsCount} esemény • {shiftsCount} munkaidő
                </div>
              </div>

              {/* Shareable Link Input Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Közvetlen megosztási link (egy kattintással csatlakozik a családtagod):</span>
                </label>
                <div className="flex items-center gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 focus-within:border-indigo-500 transition">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 bg-transparent px-3 py-1.5 text-xs text-indigo-200 font-mono focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Másolva!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Link másolása</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Button: Native Share */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-indigo-600/25"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Meghívó link megosztása (WhatsApp / Messenger / SMS)</span>
                </button>
              </div>

              {/* Connect to another family code */}
              {onJoinFamily && (
                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-200">
                      Csatlakozás a családhoz kód beírásával
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Ha a párod külön nyitotta meg az alkalmazást, egyszerűen másold be a másik telefonon látható Családi Kódot:
                  </p>
                  <form onSubmit={handleJoinSubmit} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Pl. csalad-9w2x vagy kovacs-csalad"
                      value={joinCodeInput}
                      onChange={(e) => {
                        setJoinCodeInput(e.target.value);
                        setJoinError(null);
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shrink-0 shadow-md shadow-indigo-600/20"
                    >
                      Csatlakozás
                    </button>
                  </form>
                  {joinError && (
                    <p className="text-[11px] text-rose-400 font-medium">{joinError}</p>
                  )}
                </div>
              )}

              {/* Key Management & Revocation / Rotation Panel */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200">Hozzáférési Kulcs & Visszavonás</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    {activeKey ? `${activeKey.slice(0, 10)}...` : 'Nincs kulcs'}
                  </span>
                </div>

                {rotateMessage && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-start gap-2 animate-in fade-in">
                    <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    <span>{rotateMessage}</span>
                  </div>
                )}

                {rotateError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{rotateError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Meghívó lejárati ideje:</span>
                    </span>
                    <select
                      value={expiryOption}
                      onChange={(e) => setExpiryOption(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 text-slate-300 text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value={0}>Örökérvényű (visszavonásig)</option>
                      <option value={7}>7 nap után lejár</option>
                      <option value={30}>30 nap után lejár</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleRevokeAndRotateKey}
                    disabled={isRotating}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>
                      {isRotating
                        ? 'Kulcs visszavonása folyamatban...'
                        : 'Régi meghívó visszavonása & Új kulcs generálása'}
                    </span>
                  </button>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Ha illetéktelen személy jutott a linkhez, ezzel a gombbal azonnal letilthatod az összes korábbi meghívót. A régi link azonnal használhatatlanná válik.
                  </p>
                </div>
              </div>

              {/* Collapsible Security & Privacy Audit Details */}
              <div className="rounded-2xl border border-slate-800 bg-slate-850/50 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowSecurityDetails(!showSecurityDetails)}
                  className="w-full p-3 flex items-center justify-between text-slate-300 hover:text-white transition cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <Info className="w-4 h-4 text-indigo-400" />
                    <span>Biztonsági & Adatvédelmi garanciák (GYIK)</span>
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {showSecurityDetails ? 'Elrejtés ▲' : 'Megtekintés ▼'}
                  </span>
                </button>

                {showSecurityDetails && (
                  <div className="p-3.5 pt-0 border-t border-slate-800/80 space-y-2.5 text-[11px] text-slate-300 leading-relaxed">
                    <div>
                      <strong className="text-white block">1. Bárki hozzáférhet-e a link birtokában?</strong>
                      Igen, a link egy kriptográfiai "Bearer capability" token. Aki megkapja a titkos kulcsot tartalmazó linket, az jogosult a naptárhoz csatlakozni. Ezért kizárólag a megbízható családtagjaidnak küldd el!
                    </div>
                    <div>
                      <strong className="text-white block">2. Lejár-e a meghívó vagy vissza lehet vonni?</strong>
                      Igen! A fenti gombbal a kulcs bármikor egyetlen kattintással visszavonható. Ezen felül kérhető 7 vagy 30 napos automatikus lejárat is.
                    </div>
                    <div>
                      <strong className="text-white block">3. A régi link működik-e a visszavonás után?</strong>
                      <span className="text-rose-300 font-semibold">NEM!</span> A szerver azonnal érvényteleníti a régi kulcs hash-ét. Bárki, aki a korábbi linket nyitja meg, 403 Forbidden hibát kap.
                    </div>
                    <div>
                      <strong className="text-white block">4. Megszerezhető-e a linkből személyes adat?</strong>
                      NEM. A link pusztán a szoba véletlen azonosítóját és a titkos kulcsot tartalmazza (`#join=...&key=...`). Semmilyen nevet, naptárbejegyzést vagy személyes adatot nem kódol.
                    </div>
                    <div>
                      <strong className="text-white block">5. Megjelenik-e a familyId vagy kulcs szerverlogokban / Referrerben?</strong>
                      NEM! A meghívó az URL Fragment (`#`) szabványt használja. A böngészők a `#` utáni tartalmat soha nem küldik el a webszervernek a kérés fejében, így sem az nginx, sem proxyk, sem külső weboldalak Referrer fejléce nem látja. Betöltés után az alkalmazás automatikusan ki is törli az URL-ből.
                    </div>
                  </div>
                )}
              </div>

              {/* Management actions: New room / Leave */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={onGenerateNewFamily}
                  className="text-slate-400 hover:text-indigo-300 flex items-center gap-1.5 transition cursor-pointer text-[11px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Új szoba létrehozása</span>
                </button>

                <button
                  type="button"
                  onClick={onLeaveFamily}
                  className="text-slate-500 hover:text-rose-400 flex items-center gap-1.5 transition cursor-pointer text-[11px]"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Kilépés a megosztásból</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-850 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
