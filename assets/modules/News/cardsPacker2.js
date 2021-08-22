(function(window)
{
	/**
	 * Выстривает карточки разного размера по подобию меню Studio. Позиционируются с помощью абсолютного
	 * позиционирования.
	 *
	 * @constructor
	 * @param {{}} params Параметры
	 * @param {HTMLElement} params.listElement DOM-элемент со списком карточек. Не должен содержать padding. В карточках
	 *  в атрибуте data-size указывается их размер (целое число).
	 * @param {number} params.cardsWidth Желаемая ширина одинарных карточек в пикселях
	 * @param {number} params.cardsRatio Высота одинарных карточек относительно их ширины
	 * @param {string} [params.cardSizeClassPrefix='news__cardSize-'] Префикс CSS-класса, обозначающего текущий размер
	 *  карточки
	 * @param {number|null} [params.maxRowsAmount=null] Максимальная высота, выраженная в количестве одинарных карточек.
	 *  Null — без ограничения.
	 */
	function CardsPacker2(params)
	{
		/**
		 * DOM-элемент со списком карточек
		 * @type {HTMLElement}
		 * @protected
		 */
		this.listElement = params.listElement;

		/**
		 * Желаемая ширина карточек в пикселях
		 * @type {number}
		 * @protected
		 */
		this.cardsWidth = Math.max(params.cardsWidth, 1);

		/**
		 * Желаемая высота карточек относительно их ширины
		 * @type {number}
		 * @protected
		 */
		this.cardsRatio = Math.max(params.cardsRatio, 0);

		/**
		 * Префикс класса, обозначающего текущий размер карточки
		 * @type {string}
		 * @protected
		 */
		this.cardSizeClassPrefix = params.cardSizeClassPrefix ? String(params.cardSizeClassPrefix) : 'news__cardSize-';

		/**
		 * Максимальная высота, выраженная в количестве одинарных карточек
		 * @type {number|null}
		 * @protected
		 */
		this.maxRowsAmount = typeof params.maxRowsAmount === 'number' ? Math.round(params.maxRowsAmount) : null;

		/**
		 * Последняя обработанная ширина блока (в пикселях)
		 * @protected
		 * @type {number|null}
		 */
		this.lastCheckedWidth = null;

		/**
		 * Последнее обработанное количество карточек в строке
		 * @protected
		 * @type {number|null}
		 */
		this.lastDisplayedCardsPerLine = null;

		/**
		 * Текущее отображаемое количество строк слотов
		 * @protected
		 * @type {number|null}
		 */
		this.lastDisplayedLinesAmount = null;

		/**
		 * Список карточек, которые участвуют в процессе
		 * @protected
		 * @type {HTMLElement[]}
		 */
		this.cards = [];


		this.handleWindowResize = this.handleWindowResize.bind(this);

		this.listElement.style.position = 'relative';
		this.listElement.style.padding  = 0;

		this.init();
		this.update();
		window.addEventListener('resize', this.handleWindowResize);
		window.addEventListener('load', this.handleWindowResize);
	}

	/**
	 * Загружает список карточек и сбрасывает состояние в начальное. При этом распределение карточек по строкам не
	 * производится.
	 */
	CardsPacker2.prototype.init = function()
	{
		this.lastCheckedWidth = null;
		this.lastDisplayedCardsPerLine = null;

		Array.prototype.forEach.call(this.listElement.children, function(card) {
			card.style.position = 'absolute';
		});

		this.cards = Array.prototype.filter.call(this.listElement.children, function(card) {
			return card.style.display !== 'none' && getComputedStyle(card).display !== 'none';
		});
	};

	/**
	 * Производит расстановку карточек (если нужно).
	 */
	CardsPacker2.prototype.update = function()
	{
		// Ширина родительского блока
		var listWidth = this.getListWidth();
		if (listWidth === this.lastCheckedWidth) {
			return;
		}

		// Определяем количество карточек в строке
		var cardsPerLine = listWidth / this.cardsWidth;
		cardsPerLine = Math.round(cardsPerLine);
		cardsPerLine = Math.max(cardsPerLine, 1);

		if (cardsPerLine !== this.lastDisplayedCardsPerLine)
		{
			// Вычисляем позиции карточек
			var cardsSizes = this.cards.map(function(card) {
				var size = Math.floor(Number(card.getAttribute('data-size')) || 0);
				size = Math.max(1, Math.min(size, cardsPerLine));
				return size;
			});
			var cardsPositions = spreadCardsSlots(cardsSizes, cardsPerLine, this.maxRowsAmount);

			// Расставляем DOM-карточки согласно полученным позициям и прописываем нужные классы
			var linesAmount = 0;
			this.cards.forEach(function(card, index) {
				var position = cardsPositions[index];
				if (position) {
					var bottom = position.y + position.height;
					if (bottom > linesAmount) {
						linesAmount = bottom;
					}
				}
			});
			this.cards.forEach(function(card, index) {
				var position = cardsPositions[index];

				if (position) {
					card.style.visibility = '';
					card.style.zIndex = '';
					card.style.width  = position.width / cardsPerLine * 100 + '%';
					card.style.height = position.height / linesAmount * 100 + '%';
					card.style.left   = position.x / cardsPerLine * 100 + '%';
					card.style.top    = position.y / linesAmount * 100 + '%';

					this.setCardSizeClass(card, position.width, position.height);
				} else {
					card.style.visibility = 'hidden';
					card.style.zIndex = -1;
					card.style.width  = 0;
					card.style.height = 0;
					card.style.left   = 0;
					card.style.top    = 0;
				}
			}.bind(this));

			// Сохраняем текущие данные параметры, чтобы не пересчитывать их заново
			this.lastCheckedWidth = listWidth;
			this.lastDisplayedCardsPerLine = cardsPerLine;
			this.lastDisplayedLinesAmount = linesAmount;
		}

		// Высота указывается в пикселях, а не в процентах, потому что элемент со списком может иметь не такую ширину, как родительский
		this.listElement.style.height = Math.round(this.lastDisplayedLinesAmount / cardsPerLine * this.cardsRatio * listWidth) + 'px';
	};

	/**
	 * Устанавливает новую желаемую ширину карточек. При этом распределение карточек по строкам не производится.
	 *
	 * @param {number} width В пикселях
	 */
	CardsPacker2.prototype.setCardsWidth = function(width)
	{
		this.cardsWidth = Math.max(width, 1);
		this.lastCheckedWidth = null;
		this.lastDisplayedCardsPerLine = null;
		this.lastDisplayedLinesAmount = null;
	};

	/**
	 * Устанавливает новую соотношение сторон карточек. При этом обновление внешнего вида не производится.
	 *
	 * @param {number} ratio Высота относительно ширины
	 */
	CardsPacker2.prototype.setCardsRatio = function(ratio)
	{
		this.cardsRatio = Math.max(ratio, 0);
		this.lastCheckedWidth = null;
	};

	/**
	 * Устанавливает новое максимальное количество строк. При этом обновление внешнего вида не производится.
	 *
	 * @param {number|null} maxRowsAmount Максимальное количество строк. Null — без ограничения.
	 */
	CardsPacker2.prototype.setMaxRowsAmount = function(maxRowsAmount)
	{
		this.maxRowsAmount = typeof maxRowsAmount === 'number' ? Math.round(maxRowsAmount) : null;
		this.lastCheckedWidth = null;
		this.lastDisplayedCardsPerLine = null;
		this.lastDisplayedLinesAmount = null;
	};

	/**
	 * Уничтожает всё, что создал. Нужно вызывать перед удалением объекта.
	 */
	CardsPacker2.prototype.destroy = function()
	{
		window.removeEventListener('resize', this.handleWindowResize);
		window.removeEventListener('load', this.handleWindowResize);

		this.listElement.style.position = null;
		this.listElement.style.padding  = null;
		this.listElement.style.height   = null;

		Array.prototype.forEach.call(this.listElement.children, function(card) {
			card.style.width  = null;
			card.style.height = null;
			card.style.left   = null;
			card.style.top    = null;
		});
	};

	/**
	 * Возвращает ширину родительского блока, на которую надо опираться при рассчётах.
	 *
	 * @protected
	 * @returns {number}
	 */
	CardsPacker2.prototype.getListWidth = function()
	{
		return this.listElement.clientWidth;
	};

	/**
	 * Устанавливает элементу карточки классы, которые соответствуют её размерам.
	 *
	 * @protected
	 * @param {HTMLElement} element Элемент карточки
	 * @param {number} width Ширина карточки в слотах
	 * @param {number} height Высота карточки в слотах
	 */
	CardsPacker2.prototype.setCardSizeClass = function(element, width, height)
	{
		var classPrefix = this.cardSizeClassPrefix;
		var size = Math.round(height);

		element.className = element.className
			.split(' ')
			.filter(function(className) {
				return className.slice(0, classPrefix.length) !== classPrefix;
			})
			.concat(size > 1 ? [classPrefix + size] : [])
			.join(' ');
	};

	/**
	 * Обрабатывает событие изменения размера окна браузера.
	 *
	 * @protected
	 */
	CardsPacker2.prototype.handleWindowResize = function()
	{
		this.update();
	};

	/**
	 * Распределяет карточки по списку.
	 *
	 * @param {number[]} cardsSizes Размеры карточек. Элементы массива — целые числа (количество слотов для
	 *  соответствующей карточки)
	 * @param {number} slotsPerLine Количество слотов на одну строку списка
	 * @param {number|null} maxRowsAmount Каксимальное количество строк
	 * @returns {({x: Number, y: Number, width: Number, height: Number}|null)[]} Координаты и размеры каждой из карточек,
	 *  полученных в аргументе cardsSizes. Выражены в количестве слотов. Если в массиве null, то эту карточку нужно скрыть.
	 */
	function spreadCardsSlots(cardsSizes, slotsPerLine, maxRowsAmount)
	{
		if (typeof maxRowsAmount !== 'number') {
			maxRowsAmount = null;
		}
		var slots = [];
		var minFreeLine = 0;

		return cardsSizes.map(function(cardSize) {
			// Вычисляем размеры карточки для отображения
			var cardWidth = cardSize;
			var cardHeight;

			if (cardWidth <= 2) {
				cardHeight = cardWidth;
			} else {
				cardHeight = Math.round(cardWidth / 1.5);
			}

			// Ищем ближайшее место в списке слотов для этой карточки
			for (var y = minFreeLine; maxRowsAmount === null || y + cardHeight <= maxRowsAmount; ++y) {
				for (var x = 0; x <= slotsPerLine - cardWidth; ++x) {
					// Место найдено? Занимаем его и возвращаем его координаты.
					if (areSlotsFree(slots, x, y, cardWidth, cardHeight)) {
						occupySlots(slots, x, y, cardWidth, cardHeight);
						if (y === minFreeLine) {
							minFreeLine = getMinFreeLine(slots, slotsPerLine, minFreeLine);
						}
						return {
							x: x,
							y: y,
							width:  cardWidth,
							height: cardHeight
						};
					}
				}
			}

			return null;
		});
	}

	function areSlotsFree(slots, left, top, width, height) {
		var x, y;

		for (y = top; y < top + height; ++y) {
			if (y >= slots.length) {
				break;
			}

			for (x = left; x < left + width; ++x) {
				if (x >= slots[y].length) {
					break;
				}

				if (slots[y][x]) {
					return false;
				}
			}
		}

		return true;
	}

	function occupySlots(slots, left, top, width, height) {
		var x, y;

		for (y = slots.length; y < top + height; ++y) {
			slots[y] = [];
		}

		for (y = top; y < top + height; ++y) {
			for (x = slots[y].length; x < left; ++x) {
				slots[y][x] = false;
			}

			for (x = left; x < left + width; ++x) {
				slots[y][x] = true;
			}
		}
	}

	function getMinFreeLine(slots, width, lastFreeLine) {
		lastFreeLine = lastFreeLine || 0;

		for (var line = lastFreeLine; ; ++line) {
			if (line >= slots.length) {
				break;
			}

			var doesHaveFreeSlots = false;

			for (var x = 0; x < width; ++x) {
				if (!slots[line][x]) {
					doesHaveFreeSlots = true;
					break;
				}
			}

			if (doesHaveFreeSlots) {
				break;
			}
		}

		return line;
	}


	if (!(window.aiger instanceof Object)) {
		window.aiger = {};
	}
	if (!(window.aiger.modules instanceof Object)) {
		window.aiger.modules = {};
	}
	if (!(window.aiger.modules.news instanceof Object)) {
		window.aiger.modules.news = {};
	}

	window.aiger.modules.news.CardsPacker2 = CardsPacker2;

})(window);
