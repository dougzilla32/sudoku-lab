// Omit visually ambiguous characters: O, 0, I, 1, S, 5
const CHARS = 'ABCDEFGHJKLMNPQRTUVWXYZ23469'

export function generateCode(len = 6) {
  return Array.from(
    { length: len },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('')
}
