import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-indigo-600">
          Freelancer Source
        </Link>
        <div className="flex gap-4 items-center">
          <Link to="/jobs">Browse Jobs</Link>
          <Link to="/login">Login</Link>
          <Link to="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
}
