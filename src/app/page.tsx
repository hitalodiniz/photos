// pages/index.js

import GoogleSignInButton from '../components/GoogleSignInButton';
export default function Home() {
  return (
    <div>
      <h1>SuaGaleria.com.br</h1>
      <p>O portal de entrega de fotos para fotógrafos profissionais.</p>
      
      {/* Aqui é onde o botão de login entra */}
      <GoogleSignInButton /> 
      
    </div>
  );
}