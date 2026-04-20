// main.tsx
import React, { useRef } from 'react'
import ReactDOM from 'react-dom/client'
import Grid, { GridHandle } from '../map/grid' //
///////////////////////////////////////////////////////////////////////
import { deplacerRobot } from '../IA/agent';
///////////////////////////////////////////////////////////////////////
const App = () => {
  const gridRef = useRef<GridHandle>(null); //

  // Cette fonction est maintenant branchée directement sur le bouton START de la grille
  const handleStartIA = () => {
    if (gridRef.current) {
      const map = gridRef.current.getMap(); //
      deplacerRobot(gridRef);
      
      // Ici, envoyer la 'map' à backend Django
    }
  };

  return (
    <div style={{
      backgroundColor: "#000000",
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Oxanium, sans-serif',
    }}>
      {/* On passe handleStartIA à la prop onStart de la Grid */}
      <Grid ref={gridRef} onStart={handleStartIA} />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)