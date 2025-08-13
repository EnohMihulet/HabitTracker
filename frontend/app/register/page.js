"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();

        const reg_res = await fetch("http://localhost:4000/register", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ username, password }),
        });

        const reg_data = await reg_res.json();

        if (!reg_res.ok) {
            setError(reg_data.error || "Register failed");
            return;
        }

        const logn_res = await fetch("http://localhost:4000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const logn_data = await logn_res.json();

        if (!logn_res.ok) {
            setError(logn_data.error || "Login failed");
            router.push("/login");
            return;
        }

        localStorage.setItem("token", logn_data.token);
        router.push("/");
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
                <h1 className="text-xl font-bold mb-4 text-center text-black">Register</h1>
                <form onSubmit={handleRegister} className="flex flex-col space-y-4 text-black">
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <input className="border p-2 rounded" type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)}/>
                    <input className="border p-2 rounded" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}/>
                    <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" type="submit"> Register </button>
                </form>
            </div>
            <button onClick={() => router.push("/login")} className="pt-2 text-blue-500 underline">Login</button>
        </main>
    );
}

