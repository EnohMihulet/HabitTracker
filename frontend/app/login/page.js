"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({username, password})
        });

        const data = await res.json();

        if (!res.ok) {
            setError(data.error || "Login failed");
            return;
        }

        localStorage.setItem("token", data.token);
        router.push("/dashboard");
    }

    return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      
        <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
            <h1 className="text-xl font-bold mb-4 text-center text-black">Login</h1>
           <form onSubmit={handleLogin} className="flex flex-col space-y-4 text-black">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <input className="border p-2 rounded" type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <input className="border p-2 rounded" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" type="submit">Login</button>
            </form>
        </div>
        <button onClick={() => router.push("/register")} className="pt-2 text-blue-500 underline">Register</button>
    </main>
  );
}
