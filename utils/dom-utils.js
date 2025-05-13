/**
 * dom-utils.js
 * 
 * Utility functions for DOM manipulation:
 * - Creating and updating UI elements
 * - Handling events
 * - Managing UI state
 */

/**
 * Create an element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {Array|string|Node} children - Child elements or text content
 * @returns {HTMLElement} Created element
 */
function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.entries(value).forEach(([styleKey, styleValue]) => {
        element.style[styleKey] = styleValue;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.substring(2).toLowerCase(), value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Add children
  if (Array.isArray(children)) {
    children.forEach(child => {
      appendToElement(element, child);
    });
  } else {
    appendToElement(element, children);
  }
  
  return element;
}

/**
 * Append a child to an element
 * @param {HTMLElement} element - Parent element
 * @param {string|Node} child - Child element or text content
 */
function appendToElement(element, child) {
  if (child === null || child === undefined) {
    return;
  }
  
  if (typeof child === 'string' || typeof child === 'number') {
    element.appendChild(document.createTextNode(child));
  } else {
    element.appendChild(child);
  }
}

/**
 * Create a button element
 * @param {string} text - Button text
 * @param {Function} onClick - Click handler
 * @param {string} className - CSS class name
 * @returns {HTMLButtonElement} Button element
 */
function createButton(text, onClick, className = '') {
  return createElement('button', {
    className,
    onClick
  }, text);
}

/**
 * Create a progress bar element
 * @param {number} value - Current value (0-100)
 * @param {string} className - CSS class name
 * @returns {HTMLDivElement} Progress bar element
 */
function createProgressBar(value, className = 'progress-bar') {
  const progressBar = createElement('div', { className });
  const progressFill = createElement('div', {
    className: 'progress-fill',
    style: { width: `${value}%` }
  });
  
  progressBar.appendChild(progressFill);
  return progressBar;
}

/**
 * Update a progress bar element
 * @param {HTMLElement} progressBar - Progress bar element
 * @param {number} value - New value (0-100)
 */
function updateProgressBar(progressBar, value) {
  const progressFill = progressBar.querySelector('.progress-fill');
  if (progressFill) {
    progressFill.style.width = `${value}%`;
  }
}

/**
 * Create a radio button group
 * @param {string} name - Group name
 * @param {Array<Object>} options - Options array with value, label, and checked properties
 * @param {Function} onChange - Change handler
 * @returns {HTMLDivElement} Radio group element
 */
function createRadioGroup(name, options, onChange) {
  const group = createElement('div', { className: 'radio-group' });
  
  options.forEach(option => {
    const label = createElement('label', { className: 'radio-label' });
    const input = createElement('input', {
      type: 'radio',
      name,
      value: option.value,
      checked: option.checked,
      onChange
    });
    
    label.appendChild(input);
    label.appendChild(document.createTextNode(' ' + option.label));
    group.appendChild(label);
  });
  
  return group;
}

/**
 * Create a checkbox element
 * @param {string} label - Checkbox label
 * @param {boolean} checked - Initial checked state
 * @param {Function} onChange - Change handler
 * @returns {HTMLLabelElement} Checkbox element
 */
function createCheckbox(label, checked, onChange) {
  const checkboxLabel = createElement('label', { className: 'checkbox-label' });
  const input = createElement('input', {
    type: 'checkbox',
    checked,
    onChange
  });
  
  checkboxLabel.appendChild(input);
  checkboxLabel.appendChild(document.createTextNode(' ' + label));
  return checkboxLabel;
}

/**
 * Create a select element
 * @param {Array<Object>} options - Options array with value and text properties
 * @param {string} selectedValue - Initially selected value
 * @param {Function} onChange - Change handler
 * @returns {HTMLSelectElement} Select element
 */
function createSelect(options, selectedValue, onChange) {
  const select = createElement('select', { onChange });
  
  options.forEach(option => {
    const optionElement = createElement('option', {
      value: option.value,
      selected: option.value === selectedValue
    }, option.text);
    
    select.appendChild(optionElement);
  });
  
  return select;
}

/**
 * Clear all children from an element
 * @param {HTMLElement} element - Element to clear
 */
function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Add event listener and return a function to remove it
 * @param {HTMLElement} element - Target element
 * @param {string} eventType - Event type
 * @param {Function} handler - Event handler
 * @returns {Function} Function to remove the event listener
 */
function addRemovableEventListener(element, eventType, handler) {
  element.addEventListener(eventType, handler);
  return () => element.removeEventListener(eventType, handler);
}

// Export the module's public API
export {
  createElement,
  createButton,
  createProgressBar,
  updateProgressBar,
  createRadioGroup,
  createCheckbox,
  createSelect,
  clearElement,
  addRemovableEventListener
};
