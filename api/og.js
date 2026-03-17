import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler(req) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get('company') || 'Company';
  const score = searchParams.get('score') || '0';
  const savings = searchParams.get('savings') || '—';
  const payment = searchParams.get('payment') || '—';
  const agents = searchParams.get('agents') || '—';
  const mode = searchParams.get('mode') || 'web2';
  const sectors = (searchParams.get('sectors') || '').split(',').filter(Boolean).slice(0,3);

  return new ImageResponse(
    <div style={{display:'flex',flexDirection:'column',width:'100%',height:'100%',background:'#1f2e3d',padding:'48px',fontFamily:'sans-serif'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'32px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{wi4px',height:'44px',borderRadius:'12px',background:'linear-gradient(135deg,#00d4c8,#7b35ff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',color:'white',fontWeight:900}}>◆</div>
          <div>
            <div style={{fontSize:'18px',fontWeight:800,color:'#e8f2f8',display:'flex'}}>OnChainBridge<span style={{color:'#00d4c8'}}>.xyz</span></div>
            <div style={{fontSize:'11px',color:'#7090a8',display:'flex'}}>WEB2 → ONCHAIN PROTOCOL</div>
          </div>
        </div>
        <div sty{padding:'6px 14px',borderRadius:'20px',background:'#00d4c812',border:'1px solid #00d4c855',color:'#00d4c8',fontSize:'12px',fontWeight:700,display:'flex'}}>{mode==='onchain'?'🔗 ONCHAIN':'🌉 WEB2'}</div>
      </div>

      {/* Company */}
      <div style={{marginBottom:'24px',display:'flex',flexDirection:'column'}}>
        <div style={{fontSize:'42px',fontWeight:800,color:'#e8f2f8',display:'flex'}}>{company}</div>
      </div>

      {/* Score bar */}
      <div style={{padding:'16px 20px',borderRadius:'12px',background:'#00d4c812',border:'1px solid #00d4c855',marginBottom:'24px',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',justifyContent:'space-betweenrginBottom:'10px'}}>
          <span style={{fontSize:'12px',color:'#7090a8',display:'flex'}}>ONCHAIN {mode==='onchain'?'COVERAGE':'POTENTIAL'}</span>
          <span style={{fontSize:'20px',fontWeight:800,color:'#00d4c8',display:'flex'}}>{score}%</span>
        </div>
        <div style={{width:'100%',height:'6px',borderRadius:'3px',background:'#00d4c818',display:'flex'}}>
          <div style={{width:`${score}%`,height:'100%',borderRadius:'3px',background:'#00d4c8',display:'flex'}}/>
        </div>
      </div>

      {/* Metrics */}
      <div style={{display:'flex',gap:'12px',marginBottom:'24px'}}>
        {[['Savings/yr',savings,'#00d4c8'],['Payment Save',payment,'#7b35ff'],['Agent Save',agents,'#d46faa']].map(([label,value,color])=>(
          <div key={label} style={{flex:1,padding:'14px',borderRadius:'10px',background:`${color}12`,border:`1px solid ${color}30`,display:'flex',flexDirection:'column',alignItems:'center'}}>
            <div style={{fontSize:'18px',fontWeight:800,color,display:'flex'}}>{value||'—'}</div>
            <div style={{fontSize:'10px',color:'#7090a8',marginTop:'4px',textTransform:'uppercase',display:'flex'}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Sectors */}
      {sectors.length>0 && <div style={{display:'flex',gap:'8px',marginBottom:'24px'}}>
        {sectors.map((s,i)=>(
          <div key={s} style={{padding:'4px 12px',borderRadius:'20px',background:`${i===0?'#00d4c8':i===1?'#7b35ff':'#d46faa'}18`,border:`1px solid ${i===0?'#00d4c8':i===1?'#7b35ff':'#d46faa'}40`,color:i===0?'#00d4c8':i===1?'#7b35ff':'#d46faa',fontSize:'12px',fontWeight:600,display:'flex'}}>{s}div>
        ))}
      </div>}

      {/* Footer */}
      <div style={{marginTop:'auto',display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:'16px',borderTop:'1px solid #32809435'}}>
        <div style={{fontSize:'12px',color:'#7090a8',display:'flex'}}>app.onchainbridge.xyz</div>
        <div style={{padding:'4px 10px',borderRadius:'20px',background:'#00d4c812',border:'1px solid #00d4c855',color:'#00d4c8',fontSize:'10px',fontWeight:700,display:'flex'}}>◆ SOLANA NATIVE</div>
      </div>
    </div>,
    { width: 1200, height: 63}
  );
}
