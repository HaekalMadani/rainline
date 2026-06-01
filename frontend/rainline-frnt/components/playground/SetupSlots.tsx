"use client";

import { ChoicesPayload, Selections } from "@/lib/Types/playgroundType";
import { chassisToLogo, lastName } from "@/lib/playgroundTeams";
import Slot from "./Slot";

type SlotKey = keyof Selections;

export default function SetupSlots({
    choices,
    selections,
    locked,
    onChange,
    teamColor,
}: {
    choices: ChoicesPayload;
    selections: Selections;
    locked?: Partial<Record<SlotKey, string>>;
    onChange: (slot: SlotKey, value: string) => void;
    teamColor?: string;
}) {
    const driverItems = choices.drivers.map((d) => ({
        value: d.code,
        label: `${d.code} · ${lastName(d.name)}`,
    }));
    const chassisItems = choices.chassis.map((c) => ({
        value: c.key,
        label: c.display_name,
        logo: chassisToLogo(c.key),
    }));
    const engineItems = choices.engines.map((e) => ({
        value: e.code,
        label: e.manufacturer,
    }));

    const lockedDriver = locked?.driver
        ? choices.drivers.find((d) => d.code === locked.driver)
        : undefined;
    const lockedChassis = locked?.chassis
        ? choices.chassis.find((c) => c.key === locked.chassis)
        : undefined;
    const lockedEngine = locked?.engine
        ? choices.engines.find((e) => e.code === locked.engine)
        : undefined;

    return (
        <div className="pg-slots">
            <Slot
                label="Driver"
                items={driverItems}
                value={selections.driver}
                locked={!!lockedDriver}
                lockedLabel={
                    lockedDriver ? `${lockedDriver.code} · ${lastName(lockedDriver.name)}` : ""
                }
                teamColor={teamColor}
                onChange={(v) => onChange("driver", v)}
            />
            <Slot
                label="Chassis"
                items={chassisItems}
                value={selections.chassis}
                locked={!!lockedChassis}
                lockedLabel={lockedChassis?.display_name ?? ""}
                lockedLogo={lockedChassis ? chassisToLogo(lockedChassis.key) : null}
                teamColor={teamColor}
                onChange={(v) => onChange("chassis", v)}
            />
            <Slot
                label="Engine"
                items={engineItems}
                value={selections.engine}
                locked={!!lockedEngine}
                lockedLabel={lockedEngine?.manufacturer ?? ""}
                teamColor={teamColor}
                onChange={(v) => onChange("engine", v)}
            />
        </div>
    );
}
