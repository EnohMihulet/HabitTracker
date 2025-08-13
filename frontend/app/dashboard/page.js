"use client";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import {PlusCircleIcon, TrashIcon, PencilSquareIcon, FireIcon, XCircleIcon} from "@heroicons/react/24/solid";

export default function Home() {
    const router = useRouter();
    const [habits, setHabits] = useState([]);

    const [isAddingHabit, setIsAddingHabit] = useState(false);
    const [habitName, setHabitName] = useState("");
    const [frequencyType, setfrequencyType] = useState("");
    const [timesPerWeek, settimesPerWeek] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    const [isRemovingHabit, setIsRemovingHabit] = useState(false);

    const handleAddHabit = async (e) => {
        e.preventDefault();
        setFormError("");
    
        const name = habitName.trim();
        let tps = timesPerWeek;
    
        if (frequencyType === "daily") tps = 7;
        else if (frequencyType === "weekly") tps = 1;
        else if (frequencyType === "custom") tps = parseInt(tps, 10);
    
        if (!name || !frequencyType || !tps) {
            setFormError("Name and frequency are required");
            return;
        }
    
        const token = localStorage.getItem("token");
        if (!token || !isTokenValid(token)) {
            localStorage.removeItem("token");
            router.replace("/login");
            return;
        }
    
        setIsSubmitting(true);
        try {
            const add_res = await fetch("http://localhost:4000/habits", {
                method: "POST",
                headers: {"Content-Type": "application/json", Authorization: `Bearer ${token}`,},
                body: JSON.stringify({name, frequencyType, timesPerWeek: tps}),
            });
    
            const data = await add_res.json().catch(() => ({}));
            if (!add_res.ok) {
                setFormError(data.error || "Failed to add habit.");
                return;
            }
    
            setHabits(prev => [{id: data.habitID, name, frequencyType, timesPerWeek: tps, streak: 0}, ...prev]);
    
            setHabitName("");
            setfrequencyType("");
            settimesPerWeek(0);
            setIsAddingHabit(false);
        } finally {
            setIsSubmitting(false);
        }
    }

    const removeHabit = async (habitID, e) => {
        e.preventDefault();

        const token = localStorage.getItem("token");
        if (!token || !isTokenValid(token)) {
            localStorage.removeItem("token");
            router.replace("/login");
            return;
        }

        const rem_res = await fetch(`http://localhost:4000/habits/${habitID}`, {
            method: "DELETE",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${token}`,},
        });

        const data = await rem_res.json().catch(() => ({}));

        if (!rem_res.ok) {
            return;
        }

        setHabits((prev) => prev.filter((h) => h.id !== habitID));
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token || !isTokenValid(token)) {
            localStorage.removeItem("token");
            router.replace("/login");
            return;
        }

        const fetchData = async () => {
            const res = await fetch("http://localhost:4000/habits/streaks", {
                method: "GET",
                headers: {"Content-Type": "application/json", Authorization: `Bearer ${token}`,}
            });

            const data = await res.json();

            if (res.ok) {
                setHabits(data);
            }
        }
        fetchData();
    }, [])

    function isTokenValid(token) {
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const now = Math.floor(Date.now() / 1000);
            return payload.exp && payload.exp > now;
        } catch (e) {
            return false;
        }
    }

    return (
        <main className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
        
            {/* Header */}
            <header className="flex items-center gap-3 bg-white p-6 shadow-sm">
                <img src="/file.svg" alt="Logo" className="h-8 w-8"></img>
                <h1 className="text-2xl font-semibold">Habit Tracker Dashboard</h1>
            </header>
    
            {/* Main Section */}
            <section className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-8 p-6 md:grid-cols-3">

                {/* Habits Section */}
                <section className="col-span-2">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="pl-3 text-3xl">Habits</h2>
                        {/* Buttons to add, remove, or edit habits */}
                        <div className="flex space-x-2">
                            <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50" onClick={ isAddingHabit ? 
                                () => {setIsAddingHabit(false)} : 
                                () => {setIsRemovingHabit(false); setIsAddingHabit(true)}}>
                                <PlusCircleIcon className="h-6 w-6 text-green-500"/>
                            </button>
                            <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50" onClick={ isRemovingHabit ? 
                                () => {setIsRemovingHabit(false); setIsAddingHabit(false)} : 
                                () => {setIsRemovingHabit(true); setIsAddingHabit(false)}}>
                                <TrashIcon className="h-6 w-6 text-red-500"/>
                            </button>
                            <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50" type="submit">
                                <PencilSquareIcon className="h-6 w-6 text-yellow-500"/> 
                            </button>
                        </div>
                    </div>

                    {/* Add Habit Section */}
                    <div className="space-y-3">
                        {isAddingHabit && (
                            <form onSubmit={handleAddHabit} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                <div className="flex flex-col space-y-2">
                                    <input type="text" value={habitName} onChange={(e) => setHabitName(e.target.value)} className="text-lg font-medium border rounded-sm p-1" placeholder="Habit Name"/>

                                    {/* Bubbles to select frequency of habit */}
                                    <fieldset>
                                        <legend className="text-sm font-md text-gray-700">Frequency:</legend>
                                        <div className="flex items-center gap-4">
                                            <label className="inline-flex items-center gap-2">
                                                <input type="radio" name="frequency" value="daily" checked={frequencyType === "daily"} onChange={(e) => setfrequencyType(e.target.value)} className="h-4 w-4 accent-blue-600"/>
                                                <span className="text-sm text-gray-800">Daily</span>
                                            </label>
                                            <label className="inline-flex items-center gap-2">
                                                <input type="radio" name="frequency" value="weekly" checked={frequencyType === "weekly"} onChange={(e) => setfrequencyType(e.target.value)} className="h-4 w-4 accent-blue-600"/>
                                                <span className="text-sm text-gray-800">Weekly</span>
                                            </label>
                                            <label className="inline-flex items-center gap-2">
                                                <input type="radio" name="frequency" value="custom" checked={frequencyType === "custom"} onChange={(e) => setfrequencyType(e.target.value)} className="h-4 w-4 accent-blue-600"/>
                                                <span className="text-sm text-gray-800">Custom</span>
                                            </label>
                                            {frequencyType === "custom" && ( 
                                                <input type="number" min={1} max={7} inputMode="numeric" value={timesPerWeek} onChange={(e) => settimesPerWeek(e.target.value)} placeholder="Times / week" className="w-36 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"/> )}
                                        </div>
                                    </fieldset>
                                    {formError && <p className="text-sm text-red-600">{formError}</p>}
                                </div>

                                {/* Submit / Cancel addition of new habit */}
                                <div className="flex items-center gap-2">
                                    <button type="button" className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50" onClick={() => setIsAddingHabit(false)}>Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">
                                        {isSubmitting ? "Adding..." : "Add Habit"}
                                    </button>
                                </div>
                            </form>
                        )}
                        {/* Display Habits */}
                        {habits.map((habit) => (
                        <div key={habit.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <div>
                                <h3 className="text-lg font-medium">{habit.name}</h3>
                                {habit.frequencyType === "custom" ? 
                                <p className="text-sm text-gray-500">{habit.timesPerWeek} {habit.timesPerWeek == 1 ? "time" : "times"} per week</p> :
                                <p className="text-sm text-gray-500">{habit.frequencyType}</p> }
                                
                            </div>
                            {habit.streak > 0 && (
                            <div className="flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-sm text-orange-700">
                                <FireIcon className="h-5 w-5 text-orange-500"></FireIcon>
                                <div>{habit.streak}</div>
                            </div>
                            )}
                            {isRemovingHabit && (
                                <button type="button" onClick={(e) => removeHabit(habit.id, e)}>
                                    <XCircleIcon className="h-7 w-7 text-red-600 hover:scale-115"/>
                                </button>
                            )}
                        </div>
                        ))}

                        {/* No habits to display */}
                        {habits.length === 0 && !isAddingHabit && (
                        <div className="flex justify-center space-x-2 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
                            <p>No habits yet. Click </p>
                            <PlusCircleIcon className="h-5 w-5 text-green-500"/> 
                            <p>to create your first one.</p>
                        </div>
                        )}        
                    </div>
                </section>

                {/* Right Section */}
                <section className="flex flex-col bg-blue-500 rounded">
                    {/* GITHUB STYPE ACTIVITY CHART TODO */}
                    <h2 className="text-3xl font-semibold w-125">TEMPORARY</h2>
                </section>
                
            </section>
    

            <footer className="bg-white p-4 text-center text-sm text-gray-500 shadow-inner">
                &copy; {new Date().getFullYear()} Habit Tracker. enohmihulet@gmail.com
           </footer>
        </main>
      );
    }