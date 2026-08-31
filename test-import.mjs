import { readFileSync as collection } from 'fs';
function foo() {
  for (const collection of []) {
    console.log(collection);
  }
}
foo();
console.log("Success");
