"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export interface DropdownItem {
    value: string;
    label: string;
    logo?: string | null;
}

export default function Dropdown({
    items,
    value,
    onChange,
    ariaLabel,
}: {
    items: DropdownItem[];
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
}) {
    const [open, setOpen] = useState(false);
    // Keyboard-highlighted option while the listbox is open (roving focus).
    const [activeIndex, setActiveIndex] = useState(-1);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

    const selected = items.find((i) => i.value === value) ?? items[0];
    const selectedIndex = items.findIndex((i) => i.value === value);
    const lastIndex = items.length - 1;

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    // Move real DOM focus onto the highlighted option so screen readers and
    // visible focus track the keyboard selection.
    useEffect(() => {
        if (open && activeIndex >= 0) optionRefs.current[activeIndex]?.focus();
    }, [open, activeIndex]);

    if (!selected) return null;

    function openMenu(initial: number) {
        setActiveIndex(initial);
        setOpen(true);
    }

    function closeMenu(refocus = true) {
        setOpen(false);
        setActiveIndex(-1);
        if (refocus) buttonRef.current?.focus();
    }

    function choose(index: number) {
        const it = items[index];
        if (!it) return;
        onChange(it.value);
        closeMenu();
    }

    function onButtonKeyDown(e: React.KeyboardEvent) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openMenu(selectedIndex >= 0 ? selectedIndex : 0);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            openMenu(selectedIndex >= 0 ? selectedIndex : lastIndex);
        }
    }

    function onListKeyDown(e: React.KeyboardEvent) {
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, lastIndex));
                break;
            case "ArrowUp":
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
                break;
            case "Home":
                e.preventDefault();
                setActiveIndex(0);
                break;
            case "End":
                e.preventDefault();
                setActiveIndex(lastIndex);
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                if (activeIndex >= 0) choose(activeIndex);
                break;
            case "Escape":
                e.preventDefault();
                closeMenu();
                break;
            case "Tab":
                closeMenu(false);
                break;
        }
    }

    return (
        <div className="pg-dd" ref={rootRef}>
            <button
                ref={buttonRef}
                type="button"
                className="pg-dd__btn"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
                onClick={() => (open ? closeMenu(false) : openMenu(selectedIndex >= 0 ? selectedIndex : 0))}
                onKeyDown={onButtonKeyDown}
            >
                {selected.logo ? (
                    <Image
                        src={selected.logo}
                        alt=""
                        width={30}
                        height={30}
                        className="pg-slot__logo"
                        unoptimized
                    />
                ) : null}
                <span className="pg-dd__value">{selected.label}</span>
                <span className={`pg-dd__caret ${open ? "up" : ""}`} aria-hidden />
            </button>
            {open && (
                <ul
                    className="pg-dd__pop"
                    role="listbox"
                    aria-label={ariaLabel}
                    onKeyDown={onListKeyDown}
                >
                    {items.map((it, i) => {
                        const isSelected = it.value === value;
                        return (
                            <li
                                key={it.value}
                                ref={(el) => {
                                    optionRefs.current[i] = el;
                                }}
                                role="option"
                                aria-selected={isSelected}
                                tabIndex={i === activeIndex ? 0 : -1}
                                data-active={i === activeIndex}
                                className={`pg-dd__opt ${isSelected ? "sel" : ""}`}
                                onMouseEnter={() => setActiveIndex(i)}
                                onClick={() => choose(i)}
                            >
                                {it.logo ? (
                                    <Image
                                        src={it.logo}
                                        alt=""
                                        width={22}
                                        height={22}
                                        className="pg-dd__optlogo"
                                        unoptimized
                                    />
                                ) : (
                                    <span className="pg-dd__optlogo" aria-hidden />
                                )}
                                <span className="pg-dd__optlabel">{it.label}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
