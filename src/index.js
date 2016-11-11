import { log } from 'zazen/utils'

type Pair<T>  = [ T, T ]
type Arrow = {
  first():  Arrow;
  second(): Arrow;
  compose(b: Arrow): Arrow;
  combine(b: Arrow): Arrow;
  fanout (b: Arrow): Arrow;
}

const flatten = (list, depth) => {
  return depth === 0 ?
    list :
    flatten(list.reduce( (acc,e) => acc.concat(e), [] ), depth-1)
}
const nested_pairs = (n) => (x) => (n===0) ? x : [].concat([nested_pairs(n-1)(x), x])

// Lifts a function into an Arrow
// arrrow :: (b -> c) -> Arrow b c
const arrow = (f: Function): Arrow  => {
  f.first  = () => arrow( ([a, _]: Pair): Pair => [f(a), _] )
  f.second = () => arrow( ([_, b]: Pair): Pair => [_, f(b)] )

  const compose = g => arrow( x => f(g(x)) )
  const combine = g => arrow( ([a, b]) => [f(a),g(b)] )

  f.compose = compose
  f.combine = combine
  f.fanout  = g => combine(g).compose( arrow( x => [x,x] ) )

  f.merge = (...a: Arrow[]): Arrow => {
    let d = a.reduce( (b, c) => {
      return b.combine(c)
    }, arrow( x => x ))
    let flat = arrow( x => flatten(x, a.length) )
    return f.compose(
      flat.compose(
        d.compose(
          nested_pairs(a.length))))
  }

  return f
}

// Lifts a function into a Stream Arrow
// stream :: (b -> c) -> Arrow [b] [c]
const stream = (f: Function): Arrow => (arrow( a => a.map(f) ))


const to_coords = ({x,y}) => ({x,y})
const to_key = ({key}) => key
const is_trusted = ({isTrusted}) => isTrusted

// Event -> Coords
let trusted = arrow(is_trusted)
// Event -> Coords
let clicks = arrow(to_coords)
// Event -> KeyCode
let keys   = arrow(to_key)
// (Event, Event) -> (Coords, KeyCode)
let inputs = arrow( x => x )
  .combine(keys)
  .combine(clicks)
  .combine(trusted)
  .compose( x => [ [ [x,x], x], x ] )
//  [a,b] => [ f(a), keys(b) ]
//  [ [a,b], c ] => [ [f(a), keys(b)], clicks(c) ]
//  [ [[a,b],c], d ] => [ [ [f(a), keys(b)], clicks(c) ], trusted(d) ]
//  x => [ [ [f(x), keys(x)], clicks(x) ], trusted(x) ]
//
let inputsify =
  arrow(log.ns("Inputsify"))
    .merge( [keys, clicks, trusted ] )

document.addEventListener('mousedown', inputsify)
document.addEventListener('keydown', inputsify)

let push = stream( x => x )

export { arrow, stream }
