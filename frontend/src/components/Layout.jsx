import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Layout() {
  const { usuario, logout } = useAuth();

  return (
    <div className="layout">
      <header className="topbar">
        <strong>Controle Financeiro</strong>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/lancamentos">Lançamentos</NavLink>
          <NavLink to="/categorias">Categorias</NavLink>
          <NavLink to="/contas">Fontes / Destinos</NavLink>
          <NavLink to="/cartoes">Cartões e Faturas</NavLink>
          <NavLink to="/relatorios">Relatórios</NavLink>
        </nav>
        <div className="topbar-user">
          <span>{usuario?.nome}</span>
          <button className="btn btn-secondary" onClick={logout}>Sair</button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
