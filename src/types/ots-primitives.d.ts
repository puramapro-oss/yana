// Runtime contracts are tested against the exact locked official OTS primitives.
declare module 'opentimestamps/src/*.js' {
  const primitive: unknown
  export default primitive
}
