import {Routes,Route} from 'react-router-dom';
import Header from './components/layout/Header';
import Home from './pages/Home/Home';
import Process from './pages/Process/Process';
import Analysis from './pages/Analysis/Analysis';
export default function App(){return <><Header/><Routes><Route path="/" element={<Home/>}/><Route path="/processo" element={<Process/>}/><Route path="/analise" element={<Analysis/>}/><Route path="*" element={<Home/>}/></Routes></>}
