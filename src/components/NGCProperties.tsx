import { useState, useRef, useEffect } from 'react';
import { NGCNode } from '@/lib/ngc-ast';
import { useTranslation } from 'react-i18next';

interface PropertiesProps {
  node: NGCNode | null;
  onPropertyChange: (nodeId: string, key: string, value: string) => void;
}

function isColorValue(value: string): boolean {
  const clean = value.replace(/^"|"$/g, '').replace(/\s/g, '');
  return /^#([0-9a-fA-F]{3,8})$/.test(clean) || /^rgba?\(\d+,\d+,\d+(,[\d.]+)?\)$/.test(clean);
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#000000';
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function getAlpha(value: string): number {
  const match = value.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
  return match ? parseFloat(match[1]) : 1;
}

function ColorInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const clean = value.replace(/^"|"$/g, '');
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const hexValue = clean.startsWith('rgb') ? rgbToHex(clean) : clean.startsWith('#') ? clean : '#000000';
  const alpha = getAlpha(clean);

  const handleColorChange = (hex: string, a: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (a < 1) {
      onChange(`"rgba(${r},${g},${b},${a})"`);
    } else {
      onChange(`"rgb(${r},${g},${b})"`);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        className="w-6 h-6 rounded-md border border-border/50 shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
        style={{ background: clean }}
        onClick={() => inputRef.current?.click()}
        title={t('editor.pickColor')}
      />
      <input
        ref={inputRef}
        type="color"
        value={hexValue}
        onChange={e => handleColorChange(e.target.value, alpha)}
        className="sr-only"
      />
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={alpha}
        onChange={e => handleColorChange(hexValue, parseFloat(e.target.value))}
        className="w-14 h-3 accent-primary cursor-pointer"
        title={`${t('editor.transparency')}: ${Math.round(alpha * 100)}%`}
      />
    </div>
  );
}

export function NGCProperties({ node, onPropertyChange }: PropertiesProps) {
  const { t } = useTranslation();
  if (!node) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-muted-foreground">{t('editor.selectElement')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full p-2 space-y-1">
      <div className="mb-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t('editor.type')}</span>
          <span className="text-xs font-medium text-foreground">{node.type}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t('editor.name')}</span>
          <span className="text-xs font-medium text-foreground">{node.name}</span>
        </div>
      </div>

      {Object.keys(node.properties).length > 0 && (
        <div className="border-t border-border pt-2 space-y-1.5">
          {Object.entries(node.properties).map(([key, value]) => (
            <div key={key} className="space-y-0.5">
              <label className="text-xs text-muted-foreground">{t(`editor.props.${key}`, { defaultValue: key })}</label>
              <div className="flex items-center gap-1.5">
                <input
                  className="flex-1 rounded-sm border border-border bg-secondary px-2 py-1 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                  value={value}
                  onChange={(e) => onPropertyChange(node.id, key, e.target.value)}
                />
                {isColorValue(value) && (
                  <ColorInput value={value} onChange={(v) => onPropertyChange(node.id, key, v)} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(node.properties).length === 0 && node.type !== 'App' && (
        <p className="text-xs text-muted-foreground italic">{t('editor.noProperties')}</p>
      )}
    </div>
  );
}
