export function toDisplayCoord(coord: number) {
    const level = (coord >> 28) & 0x3;
    const x = (coord >> 14) & 0x3fff;
    const z = coord & 0x3fff;

    const mx = (x / 64) | 0;
    const mz = (z / 64) | 0;
    const lx = x % 64;
    const lz = z % 64;
    return `${level}_${mx}_${mz}_${lx}_${lz}`;
}

export function toAbsolute(coord: number) {
    const level = (coord >> 28) & 0x3;
    const x = (coord >> 14) & 0x3fff;
    const z = coord & 0x3fff;

    return { level, x, z };
}

export function toCoord(level: number, x: number, z: number) {
    return (level << 28) | (x << 14) | z;
}