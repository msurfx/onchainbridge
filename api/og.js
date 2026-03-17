import { ImageResponse } from '@vercel/og';
import React from 'react';

export const config = { runtime: 'edge' };

export default function handler(req) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get('company') || 'Company';
  const score = searchParams.get('score') || '0';
  const savings = searchParams.get('savings') || '-';
  const payment = searchParams.get('payment') || '-';
  const agents = searchParams.get('agents') || '-';
  const mode = searchParams.get('mode') || 'web2';
  const sectors = (searchParams.get('sectors') || '').split(',').filter(Boolean).slice(0,3);
  const sectorColors = ['#00d4c8','#7b35ff','#d46faa'];
  const e = React.createElement;

  const sectorEls = sectors.map(function(s, i) {
    const c = sectorColors[i] || '#00d4c8';
    return e('div', { key: s, style: { padding:'4px 14px', borderRadius:'20px', background: c+'18', border:'1px solid '+c+'40', color: c, fontSize:'13px', fontWeight:600, display:'flex' } }, s);
  });

  return new ImageResponse(
    e('div', { style: { display:'flex', flexDirection:'column', width:'100%', height:'100%', background:'#1f2e3d', padding:'48px', fontFamily:'sans-serif' } },
      e('div', { style: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'32px' } },
        e('div', { style: { display:'flex', alignItems:'center', gap:'12px' } },
          e('div', { style: { width:'44px', height:'44px', borderRadius:'12px', background:'linear-gradient(135deg,#00d4c8,#7b35ff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', color:'white', fontWeight:900 } }, '◆'),
          e('div', { style: { display:'flex', flexDirection:'column' } },
            e('div', { style: { fontSize:'18px', fontWeight:800, color:'#e8f2f8', display:'flex' } }, 'OnChainBridge.xyz'),
            e('div', { style: { fontSize:'11px', color:'#7090a8', display:'flex' } }, 'WEB2 → ONCHAIN')
          )
        ),
        e('div', { style: { padding:'6px 16px', borderRadius:'20px', background:'#00d4c812', border:'1px solid #00d4c855', color:'#00d4c8', fontSize:'13px', fontWeight:700, display:'flex' } }, mode === 'onchain' ? 'ONCHAIN' : 'WEB2')
      ),
      e('div', { style: { fontSize:'48px', fontWeight:800, color:'#e8f2f8', marginBottom:'24px', display:'flex' } }, company),
      e('div', { style: { padding:'16px 20px', borderRadius:'12px', background:'#00d4c812', border:'1px solid #00d4c855', marginBottom:'24px', display:'flex', flexDirection:'column' } },
        e('div', { style: { display:'flex', justifyContent:'space-between', marginBottom:'10px' } },
          e('span', { style: { fontSize:'12px', color:'#7090a8', display:'flex' } }, mode === 'onchain' ? 'ONCHAIN COVERAGE' : 'ONCHAIN POTENTIAL'),
          e('span', { style: { fontSize:'22px', fontWeight:800, color:'#00d4c8', display:'flex' } }, score + '%')
        ),
        e('div', { style: { width:'100%', height:'8px', borderRadius:'4px', background:'#00d4c818', display:'flex' } },
          e('div', { style: { width: score + '%', height:'100%', borderRadius:'4px', background:'#00d4c8', display:'flex' } })
        )
      ),
      e('div', { style: { display:'flex', gap:'12px', marginBottom:'24px' } },
        e('div', { style: { flex:1, padding:'14px', borderRadius:'10px', background:'#00d4c812', border:'1px solid #00d4c830', display:'flex', flexDirection:'column', alignItems:'center' } },
          e('div', { style: { fontSize:'20px', fontWeight:800, color:'#00d4c8', display:'flex' } }, savings),
          e('div', { style: { fontSize:'11px', color:'#7090a8', marginTop:'4px', display:'flex' } }, 'Savings/yr')
        ),
        e('div', { style: { flex:1, padding:'14px', borderRadius:'10px', background:'#7b35ff12', border:'1px solid #7b35ff30', display:'flex', flexDirection:'column', alignItems:'center' } },
          e('div', { style: { fontSize:'20px', fontWeight:800, color:'#7b35ff', display:'flex' } }, payment),
          e('div', { style: { fontSize:'11px', color:'#7090a8', marginTop:'4px', display:'flex' } }, 'Payment Save')
        ),
        e('div', { style: { flex:1, padding:'14px', borderRadius:'10px', background:'#d46faa12', border:'1px solid #d46faa30', display:'flex', flexDirection:'column', alignItems:'center' } },
          e('div', { style: { fontSize:'20px', fontWeight:800, color:'#d46faa', display:'flex' } }, agents),
          e('div', { style: { fontSize:'11px', color:'#7090a8', marginTop:'4px', display:'flex' } }, 'Agent Save')
        )
      ),
      e('div', { style: { display:'flex', gap:'8px', marginBottom:'24px' } }, ...sectorEls),
      e('div', { style: { marginTop:'auto', display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'16px', borderTop:'1px solid #32809435' } },
        e('div', { style: { fontSize:'13px', color:'#7090a8', display:'flex' } }, 'app.onchainbridge.xyz'),
        e('div', { style: { padding:'4px 12px', borderRadius:'20px', background:'#00d4c812', border:'1px solid #00d4c855', color:'#00d4c8', fontSize:'11px', fontWeight:700, display:'flex' } }, '◆ OnChainBridge')
      )
    ),
    { width: 1200, height: 630 }
  );
}
