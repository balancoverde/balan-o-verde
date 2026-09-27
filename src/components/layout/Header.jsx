import {Link,useLocation} from 'react-router-dom';
import {useEffect,useState} from 'react';
import {Activity} from 'lucide-react';
import {PT,EN} from '../../i18n';
import './header.css';
export default function Header(){const [lang,setLang]=useState(()=>localStorage.getItem('balanco-verde-lang')||'pt');const loc=useLocation();const t=lang==='pt'?PT:EN;useEffect(()=>localStorage.setItem('balanco-verde-lang',lang),[lang]);return <header className="site-header"><Link to="/" className="brand"><span className="brand-mark"><Activity size={17}/></span>{t.brand}</Link><nav><Link className={loc.pathname==='/'?'active':''} to="/">{t.home}</Link><Link className={loc.pathname==='/processo'?'active':''} to="/processo">{t.create}</Link><Link className={loc.pathname==='/analise'?'active':''} to="/analise">{t.analysis}</Link></nav><div className="lang"><button className={lang==='pt'?'selected':''} onClick={()=>setLang('pt')}>PT</button><button className={lang==='en'?'selected':''} onClick={()=>setLang('en')}>EN</button></div></header>}
