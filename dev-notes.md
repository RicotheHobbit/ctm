# Actor notes

> The Actor#getData default implementation gives you the following for use in sheet rendering:

```
  actor -> the Actor instance
  data -> a cloned copy of Actor#data
  items -> a cloned copy of Actor#data#items
  effects -> a cloned copy of Actor#data#effects
```

> if all you need is a safe copy of `Actor#data`, you'll be much better off by simply defining your own function and avoiding all the wasted work that the parent class does which will slow down your sheet
```js
getData(options) {
  return {
    data: foundry.utils.deepClone(this.object.data)
  }
}
```

who knows, maybe you don't even need to copy your actor data, skip the copy and it's even faster:
```js
getData(options) {
  return {
    data: this.object.data
  }
}
```


Atropos19/02/2021
There are two recommended ways to create owned items in 0.8.0:
```js
await Item.create(itemData, {parent: actor});
await actor.createEmbeddedDocuments("Item", itemDataArray);
```


You can update an embedded item in one of two ways:
```js
//Method 1:

const item = actor.items.get(itemId);
item.update(data);

//Method 2:
actor.updateEmbeddedDocuments("Item", [{_id: itemId, ...}]);
```


I noticed adding an ActiveEffect to an actor in code using

```js
this.createEmbeddedDocuments('ActiveEffect', [effet], options);
this.applyActiveEffects();
```

Atropos — Aujourd’hui à 14:42
Two notes on this:
1. You don't actually need to call this.applyActiveEffects() because this will happen automatically whenever an effect is created/updated/deleted
2. If you want to suppress the automatic display of the sheet for the newly created document, you can pass options.renderSheet = false as part of your options object