// web/src/pages/Login.tsx
import { useState } from "react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("admin@nustrial.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const r = await api.post("/auth/login", { email, password });
      const token = r.data?.accessToken || r.data?.token;
      const role = r.data?.user?.role;
      if (!token) throw new Error("Respuesta sin token");
      localStorage.setItem("token", token);
      localStorage.setItem("role", role || "viewer");
      let targetProject = localStorage.getItem("lastProjectId") || "";
      try {
        const projectsRes = await api.get("/projects");
        const firstProject = projectsRes.data?.[0];
        if (firstProject?.id) {
          targetProject = firstProject.id;
          localStorage.setItem("lastProjectId", targetProject);
        }
      } catch (projectError) {
        console.error("No se pudieron cargar proyectos", projectError);
      }
      if (targetProject) {
        nav(`/projects/${targetProject}`, { replace: true });
      } else {
        nav("/projects", { replace: true });
      }
    } catch (e: any) {
      setErr(e?.response?.data?.title || e?.message || "Error de login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-semibold mb-4">Iniciar sesión</h1>
        <label className="block text-sm mb-1">Email</label>
        <input className="w-full border rounded px-3 py-2 mb-3"
               value={email} onChange={e=>setEmail(e.target.value)} />
        <label className="block text-sm mb-1">Contraseña</label>
        <input type="password" className="w-full border rounded px-3 py-2 mb-3"
               value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
        <button disabled={loading}
                className="w-full py-2 rounded bg-black text-white">
          {loading ? "Ingresando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
