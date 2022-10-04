import * as ouml from 'ouml'
/* 

todo: 
hide() should be cancellable
virtual dom, diffing, some kind of mini react? Nope. Started using svelte instead, and scrapped this project :-)
*/
/*

© 2018 lhli.net

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

https://opensource.org/licenses/MIT

*/
export class Ö extends Array {
	// Instantiated by calls to ö(selector) factory, should not be used directly.
	// Redundant with class fields.
	/*constructor(...nodes) {
		  super(...nodes);
		  this.q = [];
	}*/
	q = []
	cached = false

	//
	// queue management
	//
	queue(f) {
		// push to queue, or run immediately if queue is empty
		ö.isFunc(f) && this.q.length > 0 ? this.q.push(f) : f(this)
		return this
	}

	startQueue(t) {
		return this.wait(t)
	}

	stopQueue() {
		this.q.aWF && this.q.aWF.el.removeEventListener(this.q.aWF.e, this.q.aWF.cb)
		// Rejects waitForQueue.
		this.q.stopQ && this.q.stopQ('Queue stopped.')
		this.q = []
		return this
	}

	// pause / resume. this.q.aWF = { el: element, e: event, cb: resolve }
	pause() {
		// check for active waitFor listener
		this.q.aWF && this.q.aWF.el.removeEventListener(this.q.aWF.e, this.q.aWF.cb)
		this.q.paused = true
		return this
	}

	unpause() {
		// resolve unpause promise, awaited in #runQueue
		this.q.paused && this.q.unpause && this.q.unpause()
		this.q.aWF && this.q.aWF.el.addEventListener(this.q.aWF.e, this.q.aWF.cb, { once: true })
		delete this.q.paused
		return this
	}

	// loops entire queue, also subsequent calls.
	// Loops back and forth if reverse = true. Loops n times, or infinitely if !n>0
	loop(n = 0, reverse = false) {
		this.q.isRunning || this.startQueue()
		this.q.loop = n > 0 ? n : Infinity
		this.q.reverseQ = reverse ? true : false
		return this
	}

	// private
	// thx https://stackoverflow.com/questions/14365318/delay-to-next-d-in-method-chain
	async #runQueue(f) {
		this.q.push(f)
		// only if first in queue
		if (this.q.length !== 1) return

		let c,
			loopC = 0
		// returned by waitForQueue()
		this.q.isRunning = new Promise(async (resolve, reject) => {
			this.q.stopQ = reject
			this.q.loop = this.q.loop ? this.q.loop : 1

			while (this.q.loop > loopC++) {
				c = 0

				while (this.q.length > c) {
					this.q.paused && (await new Promise(resolve => (this.q.unpause = resolve)))
					// run queue
					await this.q[c++](this)
				}

				if (this.q.reverseQ) {
					// skip last item, first and last in queue only run once per loop
					c -= 2
					// skip first item
					while (c > 0) {
						this.q.paused && (await new Promise(resolve => (this.q.unpause = resolve)))
						// run queue in reverse
						await this.q[c--](this)
					}
				}
			}
			// if reverse, finish with first item
			this.q.reverseQ && (await this.q[0](this))
			// reset q
			this.q = []
			resolve('Queue finished.')
		}).catch(e => ö.warn(ö.message(e), this))
	}

	//
	// async
	//

	//thenable/awaitable

	// resolved by #runQueue(), rejected by stopQueue().
	waitForQueue() {
		return this.q.isRunning || Promise.resolve('Queue not running.')
	}

	//chainable, returns this (async versions are found in ö)
	wait(t = 1) {
		this.#runQueue(async () => await new Promise(resolve => setTimeout(resolve, t)))
		return this
	}

	waitFor(selector, event) {
		this.#runQueue(async () => {
			await new Promise(resolve => {
				const element = ö(selector)[0]
				// save active waitFor listener in q for de/reactivation
				this.q.aWF = { el: element, e: event, cb: resolve }
				element.addEventListener(event, resolve, { once: true })
			})
		})
		return this
	}

	waitFrames(t) {
		this.#runQueue(async () => await ö.waitFrames(t))
		return this
	}

	load(url, f, isJSON = false) {
		this.#runQueue(async () => {
			// callback arg is optional
			const result = await ö.load(url, ö.isBool(f) ? f : isJSON)
			if (!ö.isFunc(f)) this.html(result)
			else
				for (let [index, element] of this.entries())
					await f.call(this, result, index, element)
		})
		return this
	}

	// delayed async callback, pauses running queue and awaits callback.
	delay(f, t = 1, removePrev = false) {
		return this.queue(() => {
			// remove previous delay
			if (removePrev && this.q.aD) clearTimeout(this.q.aD)
			this.q.aD = setTimeout(async () => {
				this.pause()
				await f(this)
				this.unpause()
			}, t)
		})
	}

	//
	// sync
	//

	// events
	// event can take space-separated string ('load DOMContentLoaded'), or object with { event: callback }
	// todo: once is weird, triggers per event type with multiple events and other stuff. Fix.
	on(event = {}, f, off = false, trigger = false, once = false, oncePerElement = false) {
		const // if string, convert to object. todo: check for string
			events = ö.isObj(event)
				? event
				: (o => {
						for (const e of event.split(' ')) o[e] = f
						return o
				  })({}),
			// set as callback if !oncePerElement
			removeAll = e => {
				for (const element of elements) ö.removeEvent(element[0], element[1], removeAll)
				// call callback
				events[e.type](e)
				elements = []
			}

		let elements = []

		this.#cache()

		return this.queue(() => {
			if (once) elements = []
			for (const element of this) {
				// remove all
				if (off && !Object.keys(events).length) ö.removeEvent(element)
				else {
					for (const event in events) {
						// remove specified
						if (off) ö.removeEvent(element, event, events[event])
						// Trigger uses f prop for details object.
						else if (trigger)
							element.dispatchEvent(new CustomEvent(event, { detail: f }))
						else if (once) {
							if (!oncePerElement) elements.push([element, event])
							ö.addEvent(
								element,
								event,
								oncePerElement ? events[event] : removeAll,
								true
							)
						} else ö.addEvent(element, event, events[event])
					}
				}
			}
		})
	}

	off(event, f) {
		return this.on(event, f, true)
	}

	// Uses f prop in Ö.on for details object
	trigger(event, detail = {}) {
		return this.on(event, detail, false, true)
	}

	once(event, f, oncePerElement) {
		return this.on(event, f, false, false, true, oncePerElement)
	}

	// listens to mouse events instead of pointer events, to produce toggle on touchscreens
	hover(over, out) {
		return ö.is(out)
			? this.on({ mouseenter: over, mouseleave: out })
			: this.on('mouseenter mouseleave', over)
	}

	debounce(event, f, t = 50, immediately = false) {
		return this.on(event, ö.throttle(f, t, true, immediately))
	}

	throttle(event, f, t = 50) {
		return this.on(event, ö.throttle(f, t))
	}

	onAnimationFrame(event, f) {
		return this.on(event, ö.onAnimationFrame(f))
	}

	// iteration

	// wraps element in ö() as argument, use forEach or for of to iterate over pure elements
	each(f) {
		return this.queue(() => {
			// conforms to forEach syntax
			for (const [index, element] of this.entries()) f(new Ö(element), index, this)
		})
	}

	// dom

	append(selector, to = false, type = 'beforeend') {
		const appendable =
				selector instanceof Ö ? selector : ö.isFunc(selector) ? [0] : ö(selector), // if function, create iterable with dummy item.
			// Clones nodes if length > 1.
			doClone = (list, element) => (list.length > 1 ? element.cloneNode(true) : element)

		return this.queue(() => {
			for (const [index, element] of this.entries())
				for (let a of appendable) {
					if (ö.isFunc(selector)) a = ö(selector(index, element.innerHTML, element))[0]
					if (to) a.insertAdjacentElement(type, doClone(appendable, element))
					else element.insertAdjacentElement(type, doClone(this, a))
				}
		})
	}

	appendTo(selector) {
		return this.append(selector, true)
	}

	prepend(selector) {
		return this.append(selector, false, 'afterbegin')
	}

	prependTo(selector) {
		return this.append(selector, true, 'afterbegin')
	}

	after(selector) {
		return this.append(selector, false, 'afterend')
	}

	insertAfter(selector) {
		return this.append(selector, true, 'afterend')
	}

	before(selector) {
		return this.append(selector, false, 'beforebegin')
	}

	insertBefore(selector) {
		return this.append(selector, true, 'beforebegin')
	}

	wrap(selector, all = false) {
		const wrapper = selector instanceof Ö ? selector[0] : ö(selector)[0]

		return this.queue(() => {
			if (all) {
				const deepest = ö.deepest(wrapper)
				this[0].parentNode.insertBefore(wrapper, this[0])
				for (const element of this) {
					deepest.appendChild(element)
				}
			} else {
				let thisWrapper
				for (const element of this) {
					thisWrapper = wrapper.cloneNode(true)
					element.parentNode.insertBefore(thisWrapper, element)
					ö.deepest(thisWrapper).appendChild(element)
				}
			}
		})
	}

	wrapAll(selector) {
		return this.wrap(selector, true)
	}

	remove() {
		return this.queue(() => {
			for (const element of this) element.parentElement.removeChild(element)
		})
	}
	// alias for remove
	detatch() {
		return this.remove()
	}

	empty() {
		return this.prop('innerHTML', '')
	}

	// properties get/set
	// handles get/set property, get/set attribute, and get/set style. Style can take a time value.
	prop(key, value, isAttr = false, isStyle = false, t) {
		// todo: if !value && key == object, set t with value
		const setStyle = (key, value, t, index, element) => {
				if (ö.is(t)) {
					this.#setTransition(element, [
						[ö.toKebabCase(key), (ö.isFunc(t) ? t(index, element) : t) / 1000],
					])
					// delay to next tick for transition to kick in
					setTimeout(() => element.style.setProperty(ö.toKebabCase(key), value), 0)
				} else element.style.setProperty(ö.toKebabCase(key), value)
			},
			getStyle = (key, element) =>
				window.getComputedStyle(element).getPropertyValue(ö.toKebabCase(key))
		// value can be omitted if key is object
		t = ö.isObj(key) && ö.is(value) ? value : t
		// get
		if (ö.isnt(value) && ö.isStr(key)) {
			const keys = key.split(' ')
			// if only one element
			return keys.length === 1
				? // return single value
				  isAttr
					? this[0].getAttribute(key)
					: isStyle
					? getStyle(key, this[0])
					: this[0][key]
				: // else return object with values
				  (() => {
						let props = {}
						for (const k of keys)
							props[k] = isAttr
								? this[0].getAttribute(k)
								: isStyle
								? getStyle(k, this[0])
								: this[0][k]
						return props
				  })()
		}

		// set
		return this.queue(
			ö.isObj(key)
				? () => {
						for (const [index, element] of this.entries())
							for (const k in key) {
								if (isAttr) element.setAttribute(k, key[k])
								else if (isStyle) setStyle(k, key[k], t, index, element)
								else element[k] = key[k]
							}
				  }
				: () => {
						for (const [index, element] of this.entries()) {
							const thisValue = ö.isFunc(value)
								? value(
										index,
										isAttr
											? element.getAttribute(key)
											: isStyle
											? getStyle(key, element)
											: element[key],
										element
								  )
								: value

							if (isAttr) element.setAttribute(key, thisValue)
							else if (isStyle) setStyle(key, thisValue, t, index, element)
							else element[key] = thisValue
						}
				  }
		)
	}

	attr(key, value) {
		return this.prop(key, value, true)
	}

	style(key, value, t) {
		return this.prop(key, value, false, true, t)
	}
	// alias for style
	css(key, value, t) {
		return this.style(key, value, t)
	}

	html(str) {
		return this.prop('innerHTML', str)
	}

	text(str) {
		return this.prop('innerText', str)
	}

	val(str) {
		return this.prop('value', str)
	}
	// alias for val
	value(str) {
		return this.val(str)
	}

	removeAttr(name) {
		return this.queue(() => {
			for (const element of this) element.removeAttribute(name)
		})
	}

	data(key, value) {
		if (ö.is(value) || ö.isObj(key)) {
			return this.queue(() => {
				for (const [index, element] of this.entries())
					ö.data(
						element,
						key,
						ö.isFunc(value) ? value(index, ö.data(element, key), element) : value
					)
			})
		} else return ö.data(this[0], key)
	}

	// Easing

	ease(easing) {
		const easings = {
			'ease-in-back': 'cubic-bezier(0.36, 0, 0.66, -0.56)',
			'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
			'ease-in-expo': 'cubic-bezier(0.7, 0, 0.84, 0)',
			'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
		}
		this.#cache()
		if (ö.is(easing))
			return this.queue(() => {
				for (const element of this)
					ö.data(element, 'ö_cache').style.ö_ease = easings[easing]
						? easings[easing]
						: easing
			})
		else return ö.data(this[0], 'ö_cache').style.ö_ease
	}

	// style convenience methods (x, y, t, args array can take functions with arguments index, element)

	hide(t = 0, visibility = false) {
		this.#cache()
		return this.queue(() => {
			for (const [index, element] of this.entries()) {
				let thisT = ö.isFunc(t) ? t(index, element) : t
				this.#setTransition(element, [['opacity', thisT / 1000]])
				// delay to next tick
				setTimeout(() => element.style.setProperty('opacity', 0), 0)
				// hide on complete
				setTimeout(
					() =>
						visibility
							? (element.style.visibility = 'hidden')
							: (element.style.display = 'none'),
					thisT
				)
			}
		})
	}

	show(t = 0) {
		let thisCache
		this.#cache()
		return this.queue(() => {
			for (const [index, element] of this.entries()) {
				thisCache = ö.data(element, 'ö_cache')
				element.style.display = thisCache.style.display
				element.style.visibility = 'visible'
				this.#setTransition(element, [
					['opacity', (ö.isFunc(t) ? t(index, element) : t) / 1000],
				])
				// delay to next tick
				setTimeout(() => (element.style.opacity = thisCache.style.opacity), 0)
			}
		})
	}

	hideShow(f, t = 300) {
		return this.hide(t, true).wait(t).queue(f).show(t)
	}

	pos(x, y, t = 0, forceFixed = false) {
		// get
		if (ö.isnt(x)) {
			// get
			let rect = this[0].getBoundingClientRect()
			return Object.assign(rect, {
				offsetX: this[0].offsetLeft,
				offsetY: this[0].offsetTop,
				offsetParent: this[0].offsetParent,
				scrollX: window.scrollX,
				scrollY: window.scrollY,
				documentX: rect.x + window.scrollX,
				documentY: rect.y + window.scrollY,
			})
		}
		// set (simply sets left & top, optionally with transition. position: fixed can be forced)
		return this.queue(() => {
			for (const [index, element] of this.entries()) {
				const thisT = ö.isFunc(t) ? t(index, element) : t,
					thisX = ö.isFunc(x) ? x(index, element) : ö.isNum(x) ? x + 'px' : x,
					thisY = ö.isFunc(y) ? y(index, element) : ö.isNum(y) ? y + 'px' : y

				if (forceFixed) element.style.position = 'fixed'
				if (ö.is(t)) {
					// force defaults
					element.style.left ??= window.getComputedStyle(element).left
					element.style.top ??= window.getComputedStyle(element).top
					window.getComputedStyle(element).top === 'auto'
						? (element.style.left = 0)
						: null
					this.#setTransition(element, [
						['left', thisT / 1000],
						['top', thisT / 1000],
					])
					// delay to next tick
					setTimeout(() => {
						element.style.left = thisX
						element.style.top = thisY
					}, 1)
				} else {
					element.style.left = thisX
					element.style.top = thisY
				}
			}
		})
	}
	// alias for pos
	position(x, y, t, forceFixed) {
		return this.pos(x, y, t, forceFixed)
	}

	transform(type, args = [], t) {
		this.#cache()
		return this.queue(() => {
			let cache,
				thisArgs = []
			// reset by passing 'none' or false.
			for (const [index, element] of this.entries())
				if (type === false || type === 'none') {
					element.style.transform = null
					// clear cache
					ö.data(element, 'ö_cache').style.ö_transform = {}
				} else {
					cache = ö.data(element, 'ö_cache').style
					// read computed styles
					let str = cache.transform + ' '
					// call functions in args, save values
					for (const [i, arg] of args.entries())
						thisArgs[i] = ö.isFunc(arg) ? arg(index, element) : arg
					// write to cache
					cache.ö_transform[type] = thisArgs
					// read cache
					for (const type in cache.ö_transform)
						str += `${type}(${cache.ö_transform[type]}) `

					if (ö.is(t)) {
						this.#setTransition(element, [
							['transform', (ö.isFunc(t) ? t(index, element) : t) / 1000],
						])
						// delay to next tick
						setTimeout(() => (element.style.transform = str), 1)
					} else element.style.transform = str
				}
		})
	}

	// Translate, rotate, scale.

	move(x, y, t) {
		return this.transform(
			'translate3d',
			[ö.isNum(x) ? x + 'px' : x, ö.isNum(y) ? y + 'px' : y, 0],
			t
		)
	}

	rotate(deg, t) {
		return this.transform('rotate3d', [0, 0, 1, ö.isNum(deg) ? deg + 'deg' : deg], t)
	}

	scale(amount, t) {
		return this.transform('scale3d', [amount, amount, 1], t)
	}

	// Shortcuts

	bg(value, t) {
		return this.style('background-color', value, t)
	}

	clr(value, t) {
		return this.style('color', value, t)
	}

	b(value = true) {
		return this.style('font-weight', value ? 'bold' : 'normal')
	}

	i(value = true) {
		return this.style('font-style', value ? 'italic' : 'normal')
	}

	u(value = true) {
		return this.style('text-decoration', value ? 'underline' : 'none')
	}

	// Internals

	#cache() {
		// run only once. Cannot use queued methods.
		if (this.cached) return
		for (const element of this) {
			// run only once per element.
			if (!ö.data(element, 'ö_cache'))
				ö.data(element, 'ö_cache', {
					// Don't read style from window/document
					style:
						element instanceof Element
							? {
									display:
										window.getComputedStyle(element).display === 'none'
											? 'block'
											: window.getComputedStyle(element).display,
									opacity: window.getComputedStyle(element).opacity || 1,
									// cache computed transforms so they can be reapplied
									transform:
										window.getComputedStyle(element).transform === 'none'
											? ''
											: window.getComputedStyle(element).transform,
									// set default for created elements
									transition:
										window.getComputedStyle(element).transition || 'all 0s',
									ö_transform: {},
									ö_transition: {},
									// set default
									ö_ease: 'ease',
							  }
							: {},
					events: new Set(),
				})
		}
		this.cached = true
	}

	#setTransition(element, values) {
		this.#cache()
		const cache = ö.data(element, 'ö_cache').style
		let str = cache.transition
		// write to cache
		for (const val of values) cache.ö_transition[val[0]] = { t: val[1], ease: cache.ö_ease }

		// read cache
		for (const type in cache.ö_transition)
			str += `, ${type} ${cache.ö_transition[type].t}s ${cache.ö_transition[type].ease}`

		element.style.setProperty('transition', str)
	}

	// class

	addClass(list, type = 'add', all = false) {
		return this.queue(() => {
			for (const element of this)
				all && type === 'remove'
					? // remove all
					  element.classList.remove(...element.classList)
					: // add/remove list
					  element.classList[type](...list.split(' '))
		})
	}

	removeClass(list) {
		return this.addClass(list, 'remove')
	}

	removeAllClasses() {
		return this.addClass(null, 'remove', true)
	}

	toggleClass(str, condition) {
		return this.queue(() => {
			for (const [index, element] of this.entries())
				element.classList.toggle(
					str,
					ö.isFunc(condition) ? condition(index, element) : condition
				)
		})
	}

	replaceClass(str, replace) {
		return this.queue(() => {
			for (const element of this) element.classList.replace(str, replace)
		})
	}

	// util

	// all=false = any element has any class, all=true = all elements have all classes
	hasClass(list, all = false) {
		for (const element of this)
			for (const str of list.split(' '))
				if (element.classList.contains(str)) {
					if (!all) return true
				} else if (all) return false
		return all ? true : false
	}

	// all=false = any element is in viewport, all=true = all are in viewport
	isInView(completely = false, all = true) {
		const inView = element => {
			const r = element.getBoundingClientRect()
			return completely
				? r.top >= 0 &&
						r.left >= 0 &&
						r.bottom <= window.innerHeight &&
						r.right <= window.innerWidth
				: r.bottom >= 0 &&
						r.right >= 0 &&
						r.top <= window.innerHeight &&
						r.left <= window.innerWidth
		}
		for (const element of this)
			if (inView(element, completely)) {
				if (!all) return true
			} else if (all) return false
		return all ? true : false
	}

	// compares every element, with isEqualNode() or strict equality
	equals(selector, strict = false) {
		const comparable = selector instanceof Ö ? selector : ö(selector)
		if (this.length !== comparable.length) return false
		for (const [index, element] of this.entries())
			if (strict) {
				if (element !== comparable[index]) return false
			} else {
				if (!element.isEqualNode(comparable[index])) return false
			}
		return true
	}

	getIndex(elem) {
		// search inside this
		if (elem instanceof Ö || elem instanceof Element) {
			const findable = elem instanceof Ö ? elem[0] : elem
			for (const [index, element] of this.entries()) if (element === findable) return index
		}
		// search for this[0] in parent or selector
		else if (!elem || ö.isStr(elem)) {
			const searchIn = ö.isStr(elem) ? ö(elem) : Array.from(this[0].parentElement.children)
			for (const [index, element] of searchIn.entries()) if (element === this[0]) return index
		}
		return -1
	}
	// alias for getIndex
	index(elem) {
		return this.getIndex(elem)
	}

	find(selector) {
		let result = []
		if (selector instanceof Ö || selector instanceof Element) {
			// search by element.contains
			const findable = selector instanceof Ö ? selector : [selector]
			for (const element of this)
				for (const f of findable) if (element !== f && element.contains(f)) result.push(f)
		} else if (ö.isStr(selector)) {
			// search by selector
			for (const element of this)
				result = result.concat(Array.from(element.querySelectorAll(selector)))
			// search by Array.find (Confusing!)
		} else if (ö.isFunc(selector)) result.push(super.find(selector))
		// if empty, say sorry.
		return (
			result.length
				? new Ö(...result)
				: ö.log(
						ö.message(`Sorry, could not find descendants for input: ${selector}.`),
						this
				  ),
			new Ö(...result)
		)
	}

	clone() {
		return this.map(element => element.cloneNode(true))
	}

	parent(selector, prev = false, next = false) {
		let result = new Set(),
			e
		for (const element of this) {
			e = prev
				? element.previousElementSibling
				: next
				? element.nextElementSibling
				: element.parentElement
			if (e && (!selector || e.matches(selector))) result.add(e)
		}
		return new Ö(...result)
	}

	prev(selector) {
		return this.parent(selector, true)
	}

	next(selector) {
		return this.parent(selector, false, true)
	}

	atIndex(index) {
		return new Ö(this[index])
	}
	// alias for atIndex
	eq(index) {
		return this.atIndex(index)
	}

	get(index = 0) {
		return this[index]
	}
	// alias for get
	e(index) {
		return this.get(index)
	}
}

/*

ö

*/
let ö = (selector, ...rest) => {
	if (ö.isFunc(selector))
		// if function, call, not before on DOMContentLoaded
		return document.readyState === 'interactive'
			? selector()
			: window.addEventListener('DOMContentLoaded', selector, { once: true })

	try {
		const nodes = ö.checkSelector(ö.isStr(selector) ? selector.trim() : selector, rest)

		if (!nodes.length)
			throw new Error(`Sorry, could not find or create elements from input: ${selector}.
Valid inputs are: String as '<html>' or 'svg<svg>' or 'selector', Element, NodeList, HTMLCollection, Ö, or Array of elements.`)

		return new Ö(...nodes)
	} catch (e) {
		ö.warn(e)
		return new Ö()
	}
}

// öQuery core
// if Element, make iterable. If Nodelist or Ö, pass on.
// if Array, check if all items are strings, and assume tagged template, or if any items are Element, and filter them out.
// if String, create Element or SVGElement or query document.
// SVGElements must be prefixed with 'svg', i.e. 'svg<circle>'
ö.checkSelector = (selector, ...rest) =>
	ö.isStr(selector)
		? selector[0] === '<' && selector[selector.length - 1] === '>'
			? [ö.createElement(selector)]
			: selector[selector.length - 1] === '>' && selector.slice(0, 3) === 'svg'
			? [ö.createElement(selector.slice(3), true)]
			: document.querySelectorAll(selector)
		: selector instanceof Element || selector === document || selector === window
		? [selector]
		: selector instanceof Ö ||
		  selector instanceof HTMLCollection ||
		  selector instanceof NodeList
		? Array.from(selector)
		: selector instanceof Array
		? selector.every(ö.isStr)
			? // if used as tagged template (concatenates strings & expressions in rest)
			  ö.checkSelector(selector.map((s, i) => s + (rest[0][i] ?? '')).join(''))
			: selector.filter(e => e instanceof Element)
		: []

// Events

ö.addEvent = (element, event, f, once = false) => {
	ö.data(element, 'ö_cache').events.add([event, f])
	// handle custom events, lookup and call observer
	if (ö.is(customEvents[event])) customEvents[event].on(element)
	element.addEventListener(event, f, { once: once })
}

ö.removeEvent = (element, event, f) => {
	const // handle custom events
		unobserve = new Set(),
		cache = ö.data(element, 'ö_cache').events,
		clearEvent = e => {
			// check for custom event, flag for unobserve
			if (ö.is(customEvents[e[0]])) unobserve.add(e[0])
			element.removeEventListener(...e)
			cache.delete(e)
		},
		// removes unused observers
		clearObservers = () => {
			for (let e of unobserve) customEvents[e].off(element)
		}

	if (ö.isnt(event)) {
		// clear all events
		for (const e of cache) clearEvent(e)
		cache.clear()
		clearObservers()
		return
	}

	if (ö.isnt(f)) {
		// clear events of type
		for (const e of cache) if (e[0] === event) clearEvent(e)
	} else {
		// clear single event
		for (const e of cache) if (e[0] === event && e[1] === f) clearEvent(e)
	}

	// handle custom events
	if (unobserve.size) {
		// check for multiple listeners of same type, unflag
		for (const e of cache) if (unobserve.has(e[0])) unobserve.delete(e[0])
		clearObservers()
	}
}

// Custom events
// container for custom events, extendable via registerCustomEvent()
const customEvents = {}

ö.registerCustomEvent = (event, on, off) => (customEvents[event] = { on: on, off: off })

// Assign ouml to ö object
ö = Object.assign(ö, ouml)

ö.wait(1, () => {
	// Delayed so imports can instantiate
	window.dispatchEvent(new Event('öQuery'))
})

export default ö
