const FLAG_PALETTES: Record<string, string[]> = {
    MON: ["#ce1126", "#ffffff"],
    MCO: ["#ce1126", "#ffffff"],
    NED: ["#ae1c28", "#ffffff", "#21468b"],
    GBR: ["#012169", "#ffffff", "#c8102e"],
    GER: ["#000000", "#dd0000", "#ffce00"],
    ESP: ["#aa151b", "#f1bf00", "#aa151b"],
    FRA: ["#0055a4", "#ffffff", "#ef4135"],
    ITA: ["#009246", "#ffffff", "#ce2b37"],
    FIN: ["#ffffff", "#003580"],
    AUS: ["#012169", "#e4002b"],
    JPN: ["#ffffff", "#bc002d"],
    CAN: ["#ff0000", "#ffffff", "#ff0000"],
    BRA: ["#009b3a", "#fedf00", "#002776"],
    MEX: ["#006847", "#ffffff", "#ce1126"],
    THA: ["#ed1c24", "#ffffff", "#241d4f"],
    DEN: ["#c8102e", "#ffffff"],
    BEL: ["#000000", "#fae042", "#ed2939"],
    POL: ["#ffffff", "#dc143c"],
    CHN: ["#de2910", "#ffde00"],
    USA: ["#bf0a30", "#ffffff", "#002868"],
    NZL: ["#012169", "#c8102e"],
    ARG: ["#74acdf", "#ffffff", "#74acdf"],
};

export default function FlagSwatch({ code }: { code: string | null | undefined }) {
    const colors = (code && FLAG_PALETTES[code]) || ["#888", "#ccc"];
    return (
        <span className="swatch">
            {colors.map((c, i) => (
                <i key={i} style={{ background: c }}></i>
            ))}
        </span>
    );
}
