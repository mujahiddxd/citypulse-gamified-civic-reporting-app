/**
 * src/context/ThemeContext.js — Visual Theme & Cosmetic Equip System
 * ------------------------------------------------------------------
 * Manages the user's active visual theme, dark/light mode, equipped
 * avatar border, and equipped title tag. Exposed globally via React Context.
 *
 * HOW THEMES WORK:
 * ─────────────────
 * The active theme is applied by setting a `data-theme` attribute on
 * the <html> element (document.documentElement). CSS variables tied to
 * that attribute change the entire color palette of the app.
 * Example: document.documentElement.setAttribute('data-theme', 'forest')
 *
 * Similarly, `data-mode="dark"` or `data-mode="light"` toggles dark/light mode.
 *
 * HOW EQUIPPED ITEMS ARE STORED:
 * ─────────────────────────────────
 * Equipped items are stored in two places, kept in sync:
 *   1. The browser's localStorage (for instant restore on page load)
 *   2. The user's inventory array in the database (persisted across devices)
 *      via the /api/store/equip backend endpoint
 *
 * The inventory array contains tagged strings like:
 *   "EQUIPPED_THEME:forest"       → active color theme
 *   "EQUIPPED_BORDER:gold-frame"  → avatar border style
 *   "EQUIPPED_TITLE:Eco Hero"     → displayed title under username
 *
 * SOURCE OF TRUTH ORDER:
 * ─────────────────────
 * 1. DB inventory (loaded from AuthContext when user logs in)
 * 2. localStorage (for non-logged-in users or before DB loads)
 *
 * CONTEXT VALUE SHAPE:
 *   theme         — current theme name (e.g. 'crimson', 'forest')
 *   mode          — 'dark' | 'light'
 *   equippedBorder — border item name or null
 *   equippedTitle  — title string or null
 *   equipItem(type, value) — equip an item (updates both state + DB)
 *   unequipItem(type)      — remove an equipped item
 *   toggleMode()           — switch between dark and light mode
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

// Create the context (empty default — values come from ThemeProvider below)
const ThemeContext = createContext({});

export const ThemeProvider = ({ children }) => {
    const { user, setUser } = useAuth(); // Access current user and updater from AuthContext

    // ── Initial State from localStorage ───────────────────────────────────────
    // Read saved preferences from localStorage so the theme loads instantly
    // without waiting for the DB or user login.
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'crimson');
    const [mode, setMode] = useState(localStorage.getItem('mode') || 'dark');
    const [equippedBorder, setEquippedBorder] = useState(localStorage.getItem('equipped_border') || null);
    const [equippedTitle, setEquippedTitle] = useState(localStorage.getItem('equipped_title') || null);

    // ── Sync with Database (authoritative source) ──────────────────────────────
    // When the user object loads (or changes), read their inventory from the DB
    // and override the localStorage-based state with the DB values.
    // This ensures multi-device consistency.
    useEffect(() => {
        if (user?.inventory) {
            const inventory = user.inventory;

            // Find tags by prefix and extract the value after the ":"
            const dbTheme = inventory.find(i => i.startsWith('EQUIPPED_THEME:'))?.split(':')[1];
            const dbBorder = inventory.find(i => i.startsWith('EQUIPPED_BORDER:'))?.split(':')[1];
            const dbTitle = inventory.find(i => i.startsWith('EQUIPPED_TITLE:'))?.split(':')[1];

            // Only update if the DB has something (DB wins over localStorage)
            if (dbTheme) setTheme(dbTheme);
            if (dbBorder) setEquippedBorder(dbBorder);
            if (dbTitle) setEquippedTitle(dbTitle);
        }
    }, [user]); // Re-run whenever the user object changes

    // ── Apply theme to the DOM ─────────────────────────────────────────────────
    // CSS listens to [data-theme="forest"] { --primary-color: green; ... }
    useEffect(() => {
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // ── Apply dark/light mode to the DOM ──────────────────────────────────────
    // CSS listens to [data-mode="light"] { background: white; ... }
    useEffect(() => {
        localStorage.setItem('mode', mode);
        document.documentElement.setAttribute('data-mode', mode);
    }, [mode]);

    // ── Persist border selection to localStorage ───────────────────────────────
    useEffect(() => {
        if (equippedBorder) localStorage.setItem('equipped_border', equippedBorder);
        else localStorage.removeItem('equipped_border'); // Clear if null
    }, [equippedBorder]);

    // ── Persist title selection to localStorage ────────────────────────────────
    useEffect(() => {
        if (equippedTitle) localStorage.setItem('equipped_title', equippedTitle);
        else localStorage.removeItem('equipped_title');
    }, [equippedTitle]);

    /**
     * toggleMode()
     * Flips between dark and light mode.
     * Can be called from the Navbar toggle button.
     */
    const toggleMode = () => setMode(prev => prev === 'dark' ? 'light' : 'dark');

    /**
     * equipItem(type, value)
     * ────────────────────────
     * Equips a cosmetic item:
     *   1. Updates local React state instantly (so UI changes immediately)
     *   2. Calls the backend to persist the equipped tag in the DB inventory
     *   3. Updates the AuthContext user.inventory so other components see the change
     *
     * type  — 'theme' | 'border' | 'title'
     * value — the item name/value to equip (e.g. 'forest', 'gold-frame', 'Eco Hero')
     */
    const equipItem = async (type, value) => {
        // Instant local update — don't wait for the network
        if (type === 'theme') setTheme(value);
        if (type === 'border') setEquippedBorder(value);
        if (type === 'title') setEquippedTitle(value);

        // Persist to DB (only if user is logged in)
        if (user) {
            try {
                // POST /api/store/equip → updates EQUIPPED_<TYPE>:<value> tag in DB
                const { data } = await api.post('/store/equip', { type, value });

                // Sync the updated inventory back into AuthContext
                // so the Store page can immediately show the item as "equipped"
                if (data.inventory && setUser) {
                    setUser(prev => ({ ...prev, inventory: data.inventory }));
                }
            } catch (err) {
                console.error(`[Theme] Failed to persist equip:`, err.response?.data?.error || err.message);
                // The visual change still happened — just couldn't save to DB
            }
        }
    };

    /**
     * unequipItem(type)
     * ──────────────────
     * Removes the currently equipped item for a given type.
     * Theme reverts to 'crimson' (default); border/title become null.
     * Also removes the EQUIPPED_ tag from the DB inventory.
     *
     * type — 'theme' | 'border' | 'title'
     */
    const unequipItem = async (type) => {
        // Revert to defaults locally
        if (type === 'theme') setTheme('crimson');
        if (type === 'border') setEquippedBorder(null);
        if (type === 'title') setEquippedTitle(null);

        if (user) {
            try {
                // POST /api/store/unequip → removes matching EQUIPPED_ tag from DB
                const { data } = await api.post('/store/unequip', { type });
                if (data.inventory && setUser) {
                    setUser(prev => ({ ...prev, inventory: data.inventory }));
                }
            } catch (err) {
                console.error(`[Theme] Failed to persist unequip:`, err.response?.data?.error || err.message);
            }
        }
    };

    return (
        <ThemeContext.Provider value={{
            theme, mode, equippedBorder, equippedTitle,
            equipItem, unequipItem, toggleMode
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Hook for easy access: const { theme, equipItem } = useTheme();
export const useTheme = () => useContext(ThemeContext);
