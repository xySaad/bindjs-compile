import { state } from "rbind";
const count = state(0);
const inc = () => count.value++;
const dec = () => count.value--;
export const Counter = () => (
  <div class="counter">
    <h1>{count.value}</h1>
    <button onClick={inc}>+</button>
    <button onClick={dec}>-</button>
  </div>
);
