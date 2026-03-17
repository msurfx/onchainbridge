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
  const sectorColors = ['#007a78','#5a20cc','#a8457e'];
  const e = React.createElement;

  const sectorEls = sectors.map(function(s, i) {
    const c = sectorColors[i] || '#007a78';
    return e('div', { key: s, style: { padding:'6px 18px', borderRadius:'20px', background: c+'15', border:'1px solid '+c+'40', color: c, fontSize:'15px', fontWeight:600, display:'flex' } }, s);
  });

  return new ImageResponse(
    e('div', { style: { display:'flex', flexDirection:'column', width:'100%', height:'100%', background:'#eef5f8', padding:'56px 64px', fontFamily:'sans-serif' } },
      e('div', { style: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'36px' } },
        e('div', { style: { display:'flex', alignItems:'center', gap:'14px' } },
          e('div', { style: { width:'52px', height:'52px', borderRadius:'14px', background:'linear-gradient(135deg,#007a78,#5a20cc)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', color:'white', fontWeight:900 } }, '◆'),
          e('div', { style: { display:'flex', flexDirection:'column' } },
            e('div', { style: { fontSize:'22px', fontWeight:800, color:'#0f1d2c', display:'flex' } }, 'OnChainBridge.xyz'),
            e('div', { style: { fontSize:'13px', color:'#5a8099', display:'flex' } }, 'WEB2 → ONCHAIN PROTOCOL')
          )
        ),
        e('div', { style: { padding:'8px 20px', borderRadius:'20px', background:'#007a7815', border:'1px solid #007a7845', color:'#007a78', fontSize:'14px', fontWeight:700, display:'flex' } }, mode === 'onchain' ? 'ONCHAIN' : 'WEB2')
      ),
      e('div', { style: { fontSize:'56px', fontWeight:800, color:'#0f1d2c', marginBottom:'28px', display:'flex' } }, company),
      e('div', { style: { padding:'20px 24px', borderRadius:'14px', background:'#007a7810', border:'1px solid #007a7840', marginBottom:'28px', display:'flex', flexDirection:'column' } },
        e('div', { style: { display:'flex', justifyContent:'space-between', marginBottom:'12px' } },
          e('span', { style: { fontSize:'14px', color:'#5a8099', display:'flex' } }, mode === 'onchain' ? 'ONCHAIN COVERAGE' : 'ONCHAIN POTENTIAL'),
          e('span', { style: { fontSize:'26px', fontWeight:800, color:'#007a78', display:'flex' } }, score + '%')
        ),
        e('div', { style: { width:'100%', height:'10px', borderRadius:'5px', background:'#007a7820', display:'flex' } },
          e('div', { style: { width: score + '%', height:'100%', borderRadius:'5px', background:'#007a78', display:'flex' } })
        )
      ),
      e('div', { style: { display:'flex', gap:'16px', marginBottom:'28px' } },
        e('div', { style: { flex:1, padding:'18px', borderRadius:'12px', background:'#ffffff', border:'1px solid #007a7830', display:'flex', flexDirection:'column', alignItems:'center' } },
          e('div', { style: { fontSize:'24px', fontWeight:800, color:'#007a78', display:'flex' } }, savings),
          e('div', { style: { fontSize:'13px', color:'#5a8099', marginTop:'6px', display:'flex' } }, 'Savings/yr')
        ),
        e('div', { style: { flex:1, padding:'18px', borderRadius:'12px', background:'#ffffff', border:'1px solid #5a20cc30', display:'flex', flexDirection:'column', alignItems:'center' } },
          e('div', { style: { fontSize:'24px', fontWeight:800, color:'#5a20cc', display:'flex' } }, payment),
          e('div', { style: { fontSize:'13px', color:'#5a8099', marginTop:'6px', display:'flex' } }, 'Payment Save')
        ),
        e('div', { style: { flex:1, padding:'18px', borderRadius:'12px', background:'#ffffff', border:'1px solid #a8457e30', display:'flex', flexDirection:'column', alignItems:'center' } },
          e('div', { style: { fontSize:'24px', fontWeight:800, color:'#a8457e', display:'flex' } }, agents),
          e('div', { style: { fontSize:'13px', color:'#5a8099', marginTop:'6px', display:'flex' } }, 'Agent Save')
        )
      ),
      e('div', { style: { display:'flex', gap:'10px', marginBottom:'auto' } }, ...sectorEls),
      e('div', { style: { display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'20px', borderTop:'1px solid #ddeaf0', marginTop:'28px' } },
        e('div', { style: { fontSize:'15px', color:'#5a8099', display:'flex' } }, 'app.onchainbridge.xyz'),
        e('div', { style: { padding:'6px 14px', borderRadius:'20px', background:'#007a7812', border:'1px solid #007a7840', color:'#007a78', fontSize:'13px', fontWeight:700, display:'flex' } }, '◆ OnChainBridge')
      )
    ),
    { width: 1200, height: 630 }
  );
}
