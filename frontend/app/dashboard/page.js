"use client";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import {PlusCircleIcon, TrashIcon, CheckIcon, PencilSquareIcon, FireIcon, XMarkIcon} from "@heroicons/react/24/solid";

export default function Home() {
    const router = useRouter();
    const [habits, setHabits] = useState([]);

    const [isAddingHabit, setIsAddingHabit] = useState(false);
    const [habitName, setHabitName] = useState("");
    const [frequencyType, setFrequencyType] = useState("");
    const [timesPerWeek, setTimesPerWeek] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    const [isRemovingHabit, setIsRemovingHabit] = useState(false);

    const [isEditingHabit, setIsEditingHabit] = useState(false);
    const [editingHabitIndex, setEditingHabitIndex] = useState();

    const [logID, setLogId] = useState(0);
    const [logIndex, setLogIndex] = useState(0);
    const [heatmap, setHeatmap] = useState(() => Array(91).fill({on:false, date: null}));
    const [dayOfTheMonth, setDayOfTheMonth] = useState(1);
    const [month, setMonth] = useState(0);

    const [dayNames, setDayNames] = useState(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
    const monthsToShow = [0,1,2].map(k => monthLabels[(month - k + 11) % 12]);

    const handleAddHabit = async (e) => {
        e.preventDefault();
        setFormError("");
    
        const name = habitName.trim();
        let tpw = timesPerWeek;
    
        if (frequencyType === "daily") tpw = 7;
        else if (frequencyType === "weekly") tpw = 1;
        else if (frequencyType === "custom") tpw = parseInt(tpw, 10);
    
        if (!name || !frequencyType || !tpw) {
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
                body: JSON.stringify({name, frequencyType, timesPerWeek: tpw})
            });
    
            const data = await add_res.json().catch(() => ({}));
            if (!add_res.ok) {
                setFormError(data.error || "Failed to add habit.");
                return;
            }
    
            setHabits(prev => [{id: data.habitID, name, frequencyType, timesPerWeek: tpw, streak: 0}, ...prev]);
    
            setHabitName("");
            setFrequencyType("");
            setTimesPerWeek(0);
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
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${token}`}
        });

        const data = await rem_res.json().catch(() => ({}));

        if (!rem_res.ok) {
            return;
        }

        setHabits((prev) => prev.filter((h) => h.id !== habitID));
    };

    const resetHabitInfo = () => {
        setEditingHabitIndex(null);
        setHabitName("");
        setFrequencyType("");
        setTimesPerWeek(null);
    }

    const handleEditHabit = async (e) => {

        const token = localStorage.getItem("token");
        if (!token || !isTokenValid(token)) {
            localStorage.removeItem("token");
            router.replace("/login");
            return;
        }

        const name = habitName.trim();
        let tpw = timesPerWeek;
        const habitID = habits[editingHabitIndex].id;

        if (frequencyType === "daily") tpw = 7;
        else if (frequencyType === "weekly") tpw = 1;
        else if (frequencyType === "custom") tpw = parseInt(tpw, 10);

        if (!name || !frequencyType || !tpw) {
            setFormError("Name and frequency are required");
            return;
        }

        const edit_res = await fetch(`http://localhost:4000/habits/${habitID}`, {
            method: "PUT",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${token}`},
            body: JSON.stringify({name, frequencyType, timesPerWeek: tpw})
        });

        const data = await edit_res.json().catch(() => ({}));

        if (!edit_res.ok) {
            return;
        }
    }

    const getLogs = async () => {
        const token = localStorage.getItem("token");
        if (!token || !isTokenValid(token)) {
            localStorage.removeItem("token");
            router.replace("/login");
            return;
        }

        const res = await fetch(`http://localhost:4000/habits/${logID}/logs`, {
            method: "GET",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${token}`}
        });

        if (!res.ok) {
            return;
        }

        const data = await res.json().catch(() => ({}));
        fillDays(data);
    }

    useEffect(() => {
        if (habits.length > 0) getLogs();
    }, [habits, logID]);

    useEffect(() => {
        if (!isEditingHabit) return;
        if (editingHabitIndex == null) return;

        const h = habits[editingHabitIndex];
        if (!h) return;

        setHabitName(h.name || "");
        setFrequencyType(h.frequencyType || "");
        setTimesPerWeek(h.timesPerWeek ?? 0);
    }, [isEditingHabit, editingHabitIndex, habits]);

    const updateHabit = async (index, completed, e) => {
        setHabits(prev => prev.map((h, i) => (i === index ? { ...h, completed } : h)));

        const token = localStorage.getItem("token");
        if (!token || !isTokenValid(token)) {
            localStorage.removeItem("token");
            router.replace("/login");
            return;
        }

        const habitId = habits[index].id;
        const method = completed ? "POST" : "DELETE";
        
        const res = await fetch(`http://localhost:4000/habits/${habitId}/log`, {
            method,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`}
        });

        if (!res.ok) {
            setHabits(prev => prev.map((h, i) => (i === index ? {...h, completed: !completed} : h)));
            return;
        }

        await fetchHabits();
        if (index === 0) getLogs();
    }

    const fetchHabits = async () => {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:4000/habits/streaks", {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setHabits(data);
        }
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
                setLogId(data[logIndex].id);
             }
        }
        fetchData();
        setUpCalendarData();
    }, [])

    

    return (
        <main className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
        
            {/* Header */}
            <header className="flex items-center gap-3 bg-white p-6 shadow-sm">
                <img src="/file.svg" alt="Logo" className="h-8 w-8"></img>
                <h1 className="text-2xl font-semibold">Habit Tracker Dashboard</h1>
            </header>

            {(isEditingHabit || isAddingHabit || isRemovingHabit) && (
                <div className="mx-auto w-full max-w-6xl px-6">
                    <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    {isAddingHabit && ("You’re adding a habit. Fill the the empty card and press 'Add Habit'.")}
                    {isEditingHabit && ("You’re editing a habit. Click a card to edit and press 'Done' to apply changes.")}
                    {isRemovingHabit && ("You’re removing a habit. Click the 'X' to remove it.")}
                    </div>
                </div>
            )}
    
            {/* Main Section */}
            <section className="mx-auto grid w-full flex-1 grid-cols-1 gap-30 p-10 pr-30 pl-30 md:grid-cols-5">

                {/* Habits Section */}
                <section className="col-span-3">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="pl-3 text-3xl">Habits</h2>
                        {/* Buttons to add, remove, or edit habits */}
                        <div className="flex space-x-2">
                            <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50" onClick={ isAddingHabit ? 
                                () => {resetHabitInfo(); setIsAddingHabit(false)} : 
                                () => {resetHabitInfo(); setIsAddingHabit(true); setIsRemovingHabit(false); setIsEditingHabit(false)}}>
                                <PlusCircleIcon className="h-6 w-6 text-green-500"/>
                            </button>
                            <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50" onClick={ isRemovingHabit ? 
                                () => {resetHabitInfo(); setIsRemovingHabit(false)} : 
                                () => {resetHabitInfo(); setIsRemovingHabit(true); setIsAddingHabit(false); setIsEditingHabit(false)}}>
                                <TrashIcon className="h-6 w-6 text-red-500"/>
                            </button>
                            <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50" onClick={ isEditingHabit ? 
                                () => {resetHabitInfo(); setIsEditingHabit(false)} :
                                () => {resetHabitInfo(); setIsEditingHabit(true); setIsAddingHabit(false); setIsRemovingHabit(false)}}>
                                <PencilSquareIcon className="h-6 w-6 text-yellow-500"/> 
                            </button>
                        </div>
                    </div>

                    {/* Add Habit Section */}
                    <div className="space-y-3">
                        {isAddingHabit && (
                            <form onSubmit={handleAddHabit} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                <div className="flex flex-col space-y-2">
                                    <input type="text" value={habitName} onChange={(e) => setHabitName(e.target.value)} className="text-lg font-medium border rounded-sm p-1 w-xs max-w-sm" placeholder="Habit Name"/>

                                    {/* Bubbles to select frequency of habit */}
                                    <fieldset>
                                        <legend className="text-sm font-md text-gray-700">Frequency:</legend>
                                        <div className="flex items-center gap-4">
                                            <label className="inline-flex items-center gap-2">
                                                <input type="radio" name="frequency" value="daily" checked={frequencyType === "daily"} onChange={(e) => setFrequencyType(e.target.value)} className="h-4 w-4 accent-blue-600"/>
                                                <span className="text-sm text-gray-800">Daily</span>
                                            </label>
                                            <label className="inline-flex items-center gap-2">
                                                <input type="radio" name="frequency" value="weekly" checked={frequencyType === "weekly"} onChange={(e) => setFrequencyType(e.target.value)} className="h-4 w-4 accent-blue-600"/>
                                                <span className="text-sm text-gray-800">Weekly</span>
                                            </label>
                                            <label className="inline-flex items-center gap-2">
                                                <input type="radio" name="frequency" value="custom" checked={frequencyType === "custom"} onChange={(e) => setFrequencyType(e.target.value)} className="h-4 w-4 accent-blue-600"/>
                                                <span className="text-sm text-gray-800">Custom</span>
                                            </label>
                                            {frequencyType === "custom" && ( 
                                                <input type="number" min={1} max={7} inputMode="numeric" value={timesPerWeek} onChange={(e) => setTimesPerWeek(Number(e.target.value))} placeholder="Times / week" className="w-36 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"/> )}
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
                        {habits.map((habit, index) => (
                            <div key={habit.id} className={["flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm transition", 
                            "hover:shadow", editingHabitIndex == index && isEditingHabit ? "ring-2 ring-blue-500 border-blue-300 bg-blue-50" : "border-gray-200",
                            isEditingHabit && editingHabitIndex !== index ? "opacity-60" : "opacity-100"].join(" ")} onClick={() => (setEditingHabitIndex(index))}>

                            {/* Edit Selected Habit */}
                            {editingHabitIndex == index && isEditingHabit ? (
                                <form onSubmit={handleEditHabit} className="flex w-full">
                                    <div className="flex flex-col space-y-2 w-full">
                                        <input type="text" value={habitName} onChange={(e) => setHabitName(e.target.value)} className="text-lg font-medium border rounded-sm p-1 max-w-xs" placeholder="Habit Name"/>

                                        {/* Bubbles to select frequency of habit */}
                                        <fieldset>
                                            <legend className="text-sm font-md text-gray-700">Frequency:</legend>
                                            <div className="flex items-center gap-4">
                                                <label className="inline-flex items-center gap-2">
                                                    <input type="radio" name="frequency" value="daily" checked={frequencyType === "daily"} onChange={(e) => setFrequencyType(e.target.value)} className="h-4 w-4 accent-blue-600"/>
                                                    <span className="text-sm text-gray-800">Daily</span>
                                                </label>
                                                <label className="inline-flex items-center gap-2">
                                                    <input type="radio" name="frequency" value="weekly" checked={frequencyType === "weekly"} onChange={(e) => setFrequencyType(e.target.value)} className="h-4 w-4 accent-blue-600"/>
                                                    <span className="text-sm text-gray-800">Weekly</span>
                                                </label>
                                                <label className="inline-flex items-center gap-2">
                                                    <input type="radio" name="frequency" value="custom" checked={frequencyType === "custom"} onChange={(e) => setFrequencyType(e.target.value)} className="h-4 w-4 accent-blue-600"/>
                                                    <span className="text-sm text-gray-800">Custom</span>
                                                </label>
                                                {frequencyType === "custom" && ( 
                                                    <input type="number" min={1} max={7} inputMode="numeric" value={timesPerWeek ? timesPerWeek : 2} onChange={(e) => setTimesPerWeek(Number(e.target.value))} placeholder="Times / week" className="w-36 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"/> )}
                                            </div>
                                        </fieldset>
                                        {formError && <p className="text-sm text-red-600">{formError}</p>}
                                    </div>

                                    {/* Submit / Cancel changes to habit */}
                                    <div className="flex items-center gap-2">
                                        <button type="button" className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50" onClick={() => {setIsEditingHabit(false); resetHabitInfo()}}>Cancel</button>
                                        <button type="submit" disabled={isSubmitting} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">
                                            {isSubmitting ? "Editing..." : "Done"}
                                        </button>
                                    </div>
                                </form> ) : (
                                 
                                    <div className="flex items-center flex-1">
                                        <div className="flex flex-col">
                                            <h3 className="text-lg font-medium">{habit.name}</h3>
                                            {habit.frequencyType === "custom" ? 
                                            <p className="text-sm text-gray-500">{habit.timesPerWeek} {habit.timesPerWeek == 1 ? "time" : "times"} per week</p> :
                                            <p className="text-sm text-gray-500">{habit.frequencyType}</p> }
                                        </div>
                                    </div> )}
                    
                            {isRemovingHabit && (
                                <button type="button" className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500 hover:scale-110" onClick={(e) => removeHabit(habit.id, e)}>
                                    <XMarkIcon className="h-5 w-5 text-white"/>
                                </button> )}
                            {!isAddingHabit && !isRemovingHabit && !isEditingHabit && (
                                <div className="flex">
                                {habit.streak > 1 && 
                                    <div className="ml-auto mr-3 flex gap-1 rounded-md bg-orange-50 px-2 py-1 text-sm text-orange-700">
                                        <FireIcon className="h-5 w-5 text-orange-500"></FireIcon>
                                        <div>{habit.streak}</div>
                                    </div>}

                                    <button type="button" aria-pressed={habit.completed} onClick={(e) => updateHabit(index, !habit.completed, e)} 
                                    className={["relative inline-flex h-8 w-8 items-center justify-center rounded-full border transition hover:scale-110",
                                    habit.completed ? "bg-green-500 border-green-500" : "bg-white border-gray-300 hover:border-gray-400"].join(" ")} title={habit.completed ? "Unmark" : "Mark"}>
                                        {habit.completed && (<CheckIcon className="h-5 w-5 text-white"/>)}
                                    </button> 
                                </div>)}
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
                <section className="flex flex-col col-span-2 ">
                    <div className="flex gap-6 bg-white rounded-2xl border border-gray-200 p-6 shadow-md text-gray-700">
                        {/* Month Labels */}
                        <div className={["flex flex-col gap-43 pr-2 text-sm font-medium text-gray-500", dayOfTheMonth < 15 ? dayOfTheMonth < 8 ? "pt-8" : "pt-16" : 
                            dayOfTheMonth < 22 ? "pt-24" : "pt-32"].join(" ")}>
                            {monthsToShow.map((monthName, i) => ( 
                            <span key={i} className={`h-4 tracking-wide`}>
                                {monthName}
                            </span>
                            ))}
                        </div>
                        {/* Day Labels */}
                        <div className="flex flex-col">
                            <div className="grid grid-flow-col gap-2 pb-2">
                                {dayNames.map((dayName, i) => (
                                <div key={i} className="text-xs font-medium text-gray-400 h-5 flex items-end justify-start w-7">
                                    { i % 2 === 0 ? dayName : ""}
                                </div>
                                ))}
                            </div>
                            {/* Heatmap */}
                            <div className="grid grid-cols-7 grid-flow-row gap-1.5">
                            {heatmap.map((d, i) => (
                                <div key={i} className="relative group">
                                    <button type="button" aria-label={d.date} className={["w-7 h-7 rounded-md transition duration-150 hover:scale-105", d.on ? "bg-green-500 hover:bg-green-600" : "bg-gray-300 opacity-40 hover:opacity-70"].join(" ")}/>
                                    <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-8 whitespace-nowrap rounded px-2 py-1 text-xs text-white bg-gray-500
                                    opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                        {d.date}
                                    </span>
                                </div>
                            ))}
                            </div>
                            <input type="number" min={1} max={habits.length} value={Number(logIndex) + 1} inputMode="numeric" placeholder="Habit to display" className="w-40 mt-5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition" 
                            onChange={(e) => {setLogIndex(e.target.value - 1); setLogId(habits[Number(e.target.value - 1)].id)}}/>
                        </div>
                        
                    </div>
                </section>
            </section>
    

            <footer className="bg-white p-4 text-center text-sm text-gray-500 shadow-inner">
                &copy; {new Date().getFullYear()} Habit Tracker. enohmihulet@gmail.com
           </footer>
        </main>
    );
      
    function isTokenValid(token) {
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const now = Math.floor(Date.now() / 1000);
            return payload.exp && payload.exp > now;
        } catch (e) {
            return false;
        }
    }

    function fillDays(data) {
        const today = new Date();
      
        const logged = new Set((data?.logs ?? []).map(l => l.date));
      
        const arr = Array.from({ length: 91 }, (_, i) => {
          const d = new Date(today);
          d.setUTCDate(d.getUTCDate() - i);
          const iso = d.toISOString().slice(0, 10);
          return { on: logged.has(iso), date: iso };
        });
      
        setHeatmap(arr);
        console.log(arr);
      }

    function setUpCalendarData() {
        const today = new Date();
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

        const date = today.toISOString().split("T")[0].split("-");
        setDayOfTheMonth(Number(date[2]));
        setMonth(Number(date[1]));
        for (let i = 0; i < today.getDay(); i++) {
            daysOfWeek.push(daysOfWeek.shift());
        }
        setDayNames(daysOfWeek);
    }
}