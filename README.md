# ö**🍳**uery,

##### or: you can't make an omelette without breaking a few eggs.

---

**ö🍳uery** is a tiny DOM and events lib, with chainable async, some basic animation, and a few useful utilities. Its main usage is for hacking, playing and prototyping, when you have an idea and want to sketch it out fast. If you're courageous, it's probably stable enough for smaller projects, where you don't need a massive framework.
ö🍳uery is partially a subset of jQuery or Zepto, and draws some humble inspiration from lodash, but it's simpler, smaller, faster, and doesn't care about IE.

It is also excellent with a swedish keyboard (If you happen to own a non-Swedish keyboard, simply reassign `ö` to for example `è`, `ü`, `Ω` or `ß`). It relies heavily on ES2015-20 features, and aims to be compatible with as few browsers as possible 🤪

**Full documentation, with runnable examples, on <a href=https://codepen.io/smlsvnssn/full/BrQjRm target=_blank>Codepen</a>**

###Usage:

```
npm install oumlquery
```

then:

```
import ö from 'oumlquery';
ö('body').rotate(180, 1000);

```
