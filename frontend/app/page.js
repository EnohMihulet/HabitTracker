"use client";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";

export default function Home() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token);
    }, []);

    return (
        <main className="flex flex-col justify-between min-h-screen bg-gray-100 text-black">
          
            <header className="flex items-center space-x-3 bg-white p-6 shadow-md">
                <img src="/file.svg" alt="Logo" className="h-8 w-8"></img>
                <h1 className="text-2xl font-bold">Habit Tracker</h1>
            </header>
    
            <section className="flex flex-col items-center justify-center flex-grow px-4 text-center space-y-8">
                <h2 className="text-3xl font-semibold">Build better habits, one day at a time.</h2>
                <p className="text-gray-600 text-lg">Track, log, and never miss a day.</p>
    
                <div className="flex space-x-4">
                {isLoggedIn ? (
                    <button onClick={() => router.push("/dashboard")} 
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded">
                        Go to Dashboard
                    </button>
                ) : ( 
                <div className="space-x-4">
                    <button onClick={() => router.push("/register")}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-7 py-2 rounded">
                        Register
                    </button>
                    <button onClick={() => router.push("/login")}
                    className="bg-gray-700 hover:bg-gray-800 text-white px-7 py-2 rounded">
                        Login
                    </button>
                </div>
              )}
            </div>
          </section>
    

          <footer className="bg-white p-4 text-center text-sm text-gray-500 shadow-inner">
            &copy; {new Date().getFullYear()} Habit Tracker. enohmihulet@gmail.com
          </footer>
        </main>
      );
    }
