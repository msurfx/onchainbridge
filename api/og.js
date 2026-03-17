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
  const colors = ['#00d4c8','#7b35ff','#d46faa'];

  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {display:'flex',flexDirection:'column',width:'100%',height:'100%',background:'#1f2e3d',padding:'48px'},
        children: [
          // Header
          {type:'div',props:{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'32px'dren:[
            {type:'div',props:{style:{display:'flex',alignItems:'center',gap:'12px'},children:[
              {type:'div',props:{style:{width:'44px',height:'44px',borderRadius:'12px',background:'linear-gradient(135deg,#00d4c8,#7b35ff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',color:'white',fontWeight:900},children:'◆'}},
              {type:'div',props:{children:[
                {type:'div',props:{style:{fontSize:'18px',fontWeight:800,color:'#e8f2f8',display:'flex'},children:['OnChainBridge',{type:'span',props:{style:{color:'#00d4c8'},children:'.xyz'}}]}},
                {type:'div',props:{style:{fontSize:'11px',color:'#7090a8',display:'flex'},children:'WEB2 → ONCHAIN PROTOCOL'}},
              ]}},
            ]}},
            {type:'div',props:{style:{padding:'6px 16px',borderRadius:'20px',background:'#00d4c812',border:'1px solid #00d4c855',color:'#00d4c8',fontSize:'13px',fontht:700,display:'flex'},children:mode==='onchain'?'ONCHAIN':'WEB2'}},
          ]}},
          // Company name
          {type:'div',props:{style:{fontSize:'48px',fontWeight:800,color:'#e8f2f8',marginBottom:'24px',display:'flex'},children:company}},
          // Score bar
          {type:'div',props:{style:{padding:'16px 20px',borderRadius:'12px',background:'#00d4c812',border:'1px solid #00d4c855',marginBottom:'24px',display:'flex',flexDirection:'column'},children:[
            {type:'div',props:{style:{display:'flex',justifyContent:'space-between',marginBottom:'10px'},children:[
              {type:'span',props:{style:{fontSize:'12px',color:'#7090a8',display:'flex'},children:mode==='onchain'?'ONCHAIN COVERAGE':'ONCHAIN POTENTIAL'}},
              {type:'span',props:{style:{fontSize:'22px',fontWeight:800,color:'#00d4c8',display:'flex'},children:score+'%'}},
            ]}},
            {type:'div',props:{style:{width:'100%',height:'8px',borderRadius:'4px',background:'#00d4c818',display:'flex'},children:[
              {type:'div',props:{style:{width:score+'%',height:'100%',borderRadius:'4px',background:'#00d4c8',display:'flex'},children:''}},
            ]}},
          ]}},
          // Metrics
          {type:'div',props:{style:{display:'flex',gap:'12px',marginBottom:'24px'},children:[
            ['Savings/yr',savings,'#00d4c8'],
            ['Payment Save',payment,'#7b35ff'],
            ['Agent Save',agents,'#d46faa'],
          ].map(([label,value,color])=>({type:'div',props:{style:{flex:1,padding:'14px',borderRadius:'10px',background:color+'12',border:'1px solid '+color+'30',display:'flex',flexDirection:'column',alignItems:'center'},children:[
            {type:'div',props:{style:{fontSize:'20px',fontWeight:800,color,display:'flex'},children:value||'—'}},
            {type:'div',props:{style:{fontSize:'11px',color:'#7090a8',marginTop:'4px',display:'flex'},children:label}},
          ]}}))}},
          // Sectors
          sectors.length > 0 ? {type:'div',props:{style:{display:'flex',gap:'8px',marginBottom:'24px'},children:sectors.map((s,i)=>({type:'div',props:{style:{padding:'4px 14px',borderRadius:'20px',background:colors[i]+'18',border:'1px solid '+colors[i]+'40',color:colors[i],fontSize:'13px',fontWeight:600,display:'flex'},children:s}}))}} : ype:'div',props:{children:''}},
          // Footer
          {type:'div',props:{style:{marginTop:'auto',display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:'16px',borderTop:'1px solid #32809435'},children:[
            {type:'div',props:{style:{fontSize:'13px',color:'#7090a8',display:'flex'},children:'app.onchainbridge.xyz'}},
            {type:'div',props:{style:{padding:'4px 12px',borderRadius:'20px',background:'#00d4c812',border:'1px solid #00d4c855',color:'#00d4c8',fontSize:'11px',fontWeight:700,display:'flex'},children:'◆ OnChainBridge'}},
          ]}},
        ]
      }
    },
    { width: 1200, height: 630 }
  );
}
