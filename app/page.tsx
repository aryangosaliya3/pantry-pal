"use client";

import { useEffect, useMemo, useState } from "react";

type PantryItem = {
  id: string;
  name: string;
  category: "Fridge" | "Freezer" | "Pantry";
  quantity: number;
  unit: string;
  icon: string;
};

type Recipe = {
  id: string;
  title: string;
  meal: "Breakfast" | "Lunch" | "Dinner";
  minutes: number;
  protein: number;
  description: string;
  uses: { name: string; amount: number }[];
};

const STARTER_ITEMS: PantryItem[] = [
  { id: "chicken-protein", name: "Chicken Protein", category: "Fridge", quantity: 1, unit: "pack", icon: "🍗" },
  { id: "nurri-protein", name: "Nurri Chocolate Protein", category: "Pantry", quantity: 12, unit: "shakes", icon: "🥤" },
  { id: "edamame", name: "Organic Edamame", category: "Freezer", quantity: 1, unit: "bag", icon: "🫛" },
  { id: "spring-rolls", name: "Spring Rolls", category: "Freezer", quantity: 1, unit: "box", icon: "🥟" },
  { id: "suja-ginger", name: "Suja Ginger", category: "Fridge", quantity: 1, unit: "pack", icon: "🧃" },
  { id: "tofu", name: "Organic Tofu", category: "Fridge", quantity: 4, unit: "blocks", icon: "◻️" },
  { id: "guacamole", name: "Guacamole Singles", category: "Fridge", quantity: 12, unit: "cups", icon: "🥑" },
  { id: "bread", name: "Oat Nut Bread", category: "Pantry", quantity: 18, unit: "slices", icon: "🍞" },
  { id: "eggs", name: "Organic White Eggs", category: "Fridge", quantity: 24, unit: "eggs", icon: "🥚" },
  { id: "strawberry", name: "Strawberry Spread", category: "Fridge", quantity: 1, unit: "jar", icon: "🍓" },
  { id: "peanut-butter", name: "Peanut Butter", category: "Pantry", quantity: 1, unit: "jar", icon: "🥜" },
  { id: "mixed-veg", name: "Organic Mixed Vegetables", category: "Freezer", quantity: 1, unit: "bag", icon: "🥦" },
];

const RECIPES: Recipe[] = [
  { id: "avo-toast", title: "Guac & Egg Power Toast", meal: "Breakfast", minutes: 8, protein: 19, description: "Crisp oat bread, creamy guacamole and jammy eggs.", uses: [{ name: "Organic White Eggs", amount: 2 }, { name: "Oat Nut Bread", amount: 2 }, { name: "Guacamole Singles", amount: 1 }] },
  { id: "pb-toast", title: "PB Strawberry Toast", meal: "Breakfast", minutes: 4, protein: 11, description: "The fast, nostalgic breakfast that travels well.", uses: [{ name: "Oat Nut Bread", amount: 2 }, { name: "Peanut Butter", amount: 0.05 }, { name: "Strawberry Spread", amount: 0.05 }] },
  { id: "tofu-bowl", title: "Crispy Tofu Veggie Bowl", meal: "Dinner", minutes: 18, protein: 27, description: "Golden tofu with colorful vegetables and edamame.", uses: [{ name: "Organic Tofu", amount: 1 }, { name: "Organic Mixed Vegetables", amount: 0.25 }, { name: "Organic Edamame", amount: 0.25 }] },
  { id: "spring-rolls", title: "Spring Roll Snack Plate", meal: "Lunch", minutes: 14, protein: 16, description: "Crispy rolls, edamame and a cooling guacamole dip.", uses: [{ name: "Spring Rolls", amount: 0.25 }, { name: "Organic Edamame", amount: 0.2 }, { name: "Guacamole Singles", amount: 1 }] },
  { id: "protein-box", title: "Backyard Fridge Protein Box", meal: "Lunch", minutes: 7, protein: 35, description: "Eggs, guacamole toast and a chocolate protein shake.", uses: [{ name: "Organic White Eggs", amount: 2 }, { name: "Oat Nut Bread", amount: 1 }, { name: "Guacamole Singles", amount: 1 }, { name: "Nurri Chocolate Protein", amount: 1 }] },
];

const STORAGE_KEY = "pantry-pal-v3";

function makeId(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
}

export default function Home() {
  const [items, setItems] = useState<PantryItem[]>(STARTER_ITEMS);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState("All");
  const [meal, setMeal] = useState("All");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const [toast, setToast] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>(RECIPES);
  const [recipeRequest, setRecipeRequest] = useState("quick and high protein");
  const [isGenerating, setIsGenerating] = useState(false);
  const [recipeError, setRecipeError] = useState("");
  const [form, setForm] = useState({ name: "", quantity: "1", unit: "item", category: "Pantry" as PantryItem["category"] });

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const stored = JSON.parse(saved) as PantryItem[];
        const merged = [...stored];
        STARTER_ITEMS.forEach((starter) => {
          if (!merged.some((item) => item.name === starter.name)) merged.push(starter);
        });
        setItems(merged);
      } catch { /* keep receipt defaults */ }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => items.filter((item) =>
    (filter === "All" || item.category === filter) && item.name.toLowerCase().includes(query.toLowerCase())
  ), [items, filter, query]);

  const availableRecipes = useMemo(() => recipes.map((recipe) => {
    const missing = recipe.uses.filter((need) => (items.find((item) => item.name === need.name)?.quantity || 0) < need.amount);
    return { ...recipe, missing };
  }).filter((recipe) => meal === "All" || recipe.meal === meal), [items, meal, recipes]);

  const adjust = (id: string, amount: number) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(0, +(item.quantity + amount).toFixed(2)) } : item));
  };

  const addItem = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setItems((current) => [...current, { id: makeId(form.name), name: form.name.trim(), quantity: Math.max(0, Number(form.quantity) || 1), unit: form.unit.trim() || "item", category: form.category, icon: "✦" }]);
    setForm({ name: "", quantity: "1", unit: "item", category: "Pantry" });
    setShowAdd(false);
    setToast("Added to your pantry");
  };

  const cook = (recipe: Recipe) => {
    setItems((current) => current.map((item) => {
      const used = recipe.uses.find((need) => need.name === item.name);
      return used ? { ...item, quantity: Math.max(0, +(item.quantity - used.amount).toFixed(2)) } : item;
    }));
    setToast(`${recipe.title} cooked — pantry updated`);
  };

  const generateRecipes = async () => {
    setIsGenerating(true);
    setRecipeError("");
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ name, quantity, unit, category }) => ({ name, quantity, unit, category })),
          meal: meal === "All" ? undefined : meal,
          request: recipeRequest,
        }),
      });
      const data = await response.json() as { recipes?: Recipe[]; error?: string };
      if (!response.ok || !data.recipes) throw new Error(data.error || "Could not generate recipes.");
      setRecipes(data.recipes);
      setMeal("All");
      setToast("Fresh AI meal ideas are ready");
    } catch (error) {
      setRecipeError(error instanceof Error ? error.message : "Could not generate recipes.");
    } finally {
      setIsGenerating(false);
    }
  };

  const lowCount = items.filter((item) => item.quantity > 0 && item.quantity <= 1).length;
  const totalUnits = Math.round(items.reduce((sum, item) => sum + item.quantity, 0));

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Pantry Pal home"><span className="brandMark">P</span><span>Pantry Pal</span></a>
        <button className="addButton" onClick={() => setShowAdd(true)}><span>＋</span> Add item</button>
      </header>

      <div className="shell" id="top">
        <section className="hero">
          <div className="heroCopy">
            <p className="eyebrow">YOUR KITCHEN, SORTED</p>
            <h1>What are we<br/><em>making today?</em></h1>
            <p className="lede">Everything you bought, wherever you stored it. Pick a quick meal and Pantry Pal keeps count.</p>
            <div className="heroActions">
              <button className="primary" onClick={() => { setMeal("Breakfast"); setShowRecipes(true); }}>☀ Breakfast ideas</button>
              <button className="secondary" onClick={() => { setMeal("Dinner"); setShowRecipes(true); }}>☾ Dinner ideas</button>
            </div>
          </div>
          <div className="heroCard" aria-label="Pantry summary">
            <div className="sunburst"><span>🍳</span></div>
            <p>READY RIGHT NOW</p>
            <strong>{availableRecipes.filter((recipe) => recipe.missing.length === 0).length} meals</strong>
            <div className="miniStats"><span><b>{items.length}</b> ingredients</span><span><b>{totalUnits}</b> total units</span><span><b>{lowCount}</b> running low</span></div>
          </div>
        </section>

        <section className="pantrySection">
          <div className="sectionHead">
            <div><p className="eyebrow">LIVE INVENTORY</p><h2>Your pantry</h2></div>
            <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an ingredient" aria-label="Find an ingredient" /></label>
          </div>
          <div className="filters" role="group" aria-label="Filter by storage location">
            {["All", "Fridge", "Freezer", "Pantry"].map((choice) => <button key={choice} className={filter === choice ? "active" : ""} onClick={() => setFilter(choice)}>{choice}{choice !== "All" && <span>{items.filter((item) => item.category === choice).length}</span>}</button>)}
          </div>
          <div className="inventoryGrid">
            {filtered.map((item) => <article className={`itemCard ${item.quantity === 0 ? "empty" : ""}`} key={item.id}>
              <div className="itemTop"><span className="foodIcon">{item.icon}</span><span className={`location ${item.category.toLowerCase()}`}>{item.category}</span></div>
              <div><h3>{item.name}</h3><p><b>{item.quantity}</b> {item.unit}</p></div>
              <div className="stepper" aria-label={`Change quantity of ${item.name}`}>
                <button onClick={() => adjust(item.id, -1)} aria-label={`Use one ${item.name}`}>−</button>
                <span>{item.quantity === 0 ? "Out" : "In stock"}</span>
                <button onClick={() => adjust(item.id, 1)} aria-label={`Add one ${item.name}`}>＋</button>
              </div>
            </article>)}
          </div>
        </section>

        <section className="recipeSection">
          <div className="recipeIntro"><p className="eyebrow">OPENAI-POWERED RECIPES</p><h2>Good food, minus<br/>the grocery run.</h2><p>Ask the AI chef for ideas matched to what you own. Cook one and its ingredients are deducted automatically.</p><button className="primary dark" onClick={() => setShowRecipes(true)}>Ask the AI chef ✦</button></div>
          <div className="recipePreview">
            {availableRecipes.slice(0, 2).map((recipe, index) => <article className="previewCard" key={recipe.id}><span className="number">0{index + 1}</span><div><span className="mealTag">{recipe.meal} · {recipe.minutes} min</span><h3>{recipe.title}</h3><p>{recipe.description}</p></div><div className="protein"><b>{recipe.protein}g</b><span>protein</span></div></article>)}
          </div>
        </section>
      </div>

      <footer><a className="brand" href="#top"><span className="brandMark">P</span><span>Pantry Pal</span></a><p>Know what you have. Make something good.</p><span>Saved on this device</span></footer>

      {showAdd && <div className="modalBackdrop" onMouseDown={() => setShowAdd(false)}><div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="add-title"><button className="close" onClick={() => setShowAdd(false)}>×</button><p className="eyebrow">NEW INGREDIENT</p><h2 id="add-title">Add to your pantry</h2><form onSubmit={addItem}><label>Ingredient name<input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Greek yogurt" /></label><div className="formRow"><label>Quantity<input type="number" min="0" step="0.25" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label><label>Unit<input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="cups" /></label></div><label>Stored in<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as PantryItem["category"] })}><option>Pantry</option><option>Fridge</option><option>Freezer</option></select></label><button className="primary dark full" type="submit">Add ingredient</button></form></div></div>}

      {showRecipes && <div className="recipeDrawer" role="dialog" aria-modal="true" aria-label="Meal ideas"><div className="drawerHead"><div><p className="eyebrow">OPENAI CHEF · MATCHED TO YOUR PANTRY</p><h2>Meal ideas</h2></div><button className="close" onClick={() => setShowRecipes(false)}>×</button></div><div className="mealFilters">{["All", "Breakfast", "Lunch", "Dinner"].map((choice) => <button key={choice} className={meal === choice ? "active" : ""} onClick={() => setMeal(choice)}>{choice}</button>)}</div><div className="aiPrompt"><label htmlFor="recipe-request">What sounds good?</label><div><input id="recipe-request" value={recipeRequest} maxLength={240} onChange={(event) => setRecipeRequest(event.target.value)} placeholder="15 minutes, high protein, spicy…" onKeyDown={(event) => { if (event.key === "Enter") void generateRecipes(); }} /><button onClick={() => void generateRecipes()} disabled={isGenerating}>{isGenerating ? "Thinking…" : "Generate with AI ✦"}</button></div><small>Your pantry is sent securely to OpenAI. The API key stays on the server.</small>{recipeError && <p role="alert">{recipeError}</p>}</div><div className="drawerList">{isGenerating && <div className="chefLoading"><span>✦</span><b>Pantry Pal is cooking up ideas…</b></div>}{!isGenerating && availableRecipes.map((recipe) => <article className="drawerRecipe" key={recipe.id}><div className="drawerRecipeTop"><span className="mealTag">{recipe.meal} · {recipe.minutes} min</span><span className={recipe.missing.length ? "missing" : "ready"}>{recipe.missing.length ? `${recipe.missing.length} missing` : "Ready to make"}</span></div><h3>{recipe.title}</h3><p>{recipe.description}</p><div className="ingredients">{recipe.uses.map((used) => <span key={used.name}>{used.amount}× {used.name.replace("Organic ", "")}</span>)}</div><button disabled={recipe.missing.length > 0} onClick={() => cook(recipe)}>{recipe.missing.length ? `Need ${recipe.missing.map((m) => m.name).join(", ")}` : "Cook & update pantry"}</button></article>)}</div></div>}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}
