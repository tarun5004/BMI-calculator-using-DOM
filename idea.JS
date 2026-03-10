const HISTORY_STORAGE_KEY = "bmiHistory";

// Kept in one place so both table and calculation logic use same ranges.
const bmiCategories = [
  {
    min: 0,
    max: 18.49,
    rangeLabel: "Below 18.5",
    category: "Underweight",
    className: "underweight",
  },
  {
    min: 18.5,
    max: 24.9,
    rangeLabel: "18.5 - 24.9",
    category: "Normal weight",
    className: "normal",
  },
  {
    min: 25,
    max: 29.9,
    rangeLabel: "25 - 29.9",
    category: "Overweight",
    className: "overweight",
  },
  {
    min: 30,
    max: Number.POSITIVE_INFINITY,
    rangeLabel: "30 and above",
    category: "Obese",
    className: "obese",
  },
];

const unitConfig = {
  metric: {
    heightLabel: "Height (cm)",
    weightLabel: "Weight (kg)",
    heightPlaceholder: "e.g. 170",
    weightPlaceholder: "e.g. 65",
    toMetric(height, weight) {
      return {
        heightInMeters: height / 100,
        weightInKg: weight,
      };
    },
  },
  imperial: {
    heightLabel: "Height (ft)",
    weightLabel: "Weight (lbs)",
    heightPlaceholder: "e.g. 5.8",
    weightPlaceholder: "e.g. 154",
    toMetric(height, weight) {
      return {
        heightInMeters: height * 0.3048,
        weightInKg: weight * 0.45359237,
      };
    },
  },
};

const form = document.querySelector("#bmiForm");
const nameInput = document.querySelector("#personName");
const heightInput = document.querySelector("#height");
const weightInput = document.querySelector("#weight");
const heightLabel = document.querySelector("#heightLabel");
const weightLabel = document.querySelector("#weightLabel");
const resetBtn = document.querySelector("#resetBtn");
const clearHistoryBtn = document.querySelector("#clearHistoryBtn");
const formMessage = document.querySelector("#formMessage");

const resultCard = document.querySelector("#resultCard");
const resultName = document.querySelector("#resultName");
const bmiValue = document.querySelector("#bmiValue");
const bmiCategory = document.querySelector("#bmiCategory");

const categoryRows = document.querySelector("#categoryRows");
const historyList = document.querySelector("#historyList");

// App state: currently selected unit and saved history list.
let selectedUnit = "metric";
let bmiHistory = loadHistory();

function loadHistory() {
  try {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch (error) {
    console.error("Failed to read local history:", error);
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(bmiHistory));
}

function setMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
}

function clearMessage() {
  formMessage.textContent = "";
  formMessage.className = "form-message";
}

function getPositiveNumber(value) {
  // Convert input string to number and reject empty/negative/zero values.
  const parsedValue = Number.parseFloat(value);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function findCategory(bmi) {
  return bmiCategories.find((item) => bmi >= item.min && bmi <= item.max);
}

function renderCategoryTable() {
  categoryRows.innerHTML = bmiCategories
    .map(
      (item) => `
        <tr>
          <td>${item.rangeLabel}</td>
          <td>${item.category}</td>
        </tr>
      `
    )
    .join("");
}

function renderHistory() {
  if (!bmiHistory.length) {
    historyList.innerHTML = `<li class="history-empty">No calculations yet.</li>`;
    return;
  }

  historyList.innerHTML = bmiHistory
    .slice()
    .reverse()
    .map(
      (entry) => `
        <li>
          <strong>${entry.name}</strong> - BMI ${entry.bmi} (${entry.category})
          <br />
          <small>${entry.mode} | ${entry.createdAt}</small>
        </li>
      `
    )
    .join("");
}

function updateInputLabels(unitType) {
  // Reuse config so labels/placeholders automatically match selected units.
  const selectedConfig = unitConfig[unitType];
  heightLabel.textContent = selectedConfig.heightLabel;
  weightLabel.textContent = selectedConfig.weightLabel;
  heightInput.placeholder = selectedConfig.heightPlaceholder;
  weightInput.placeholder = selectedConfig.weightPlaceholder;
}

function showResult(userName, bmi, categoryData) {
  resultCard.classList.remove("hidden");

  // Clear old category class first so color updates correctly each time.
  resultCard.classList.remove("underweight", "normal", "overweight", "obese");
  resultCard.classList.add(categoryData.className);

  resultName.textContent = `Name: ${userName}`;
  bmiValue.textContent = bmi.toFixed(2);
  bmiCategory.textContent = categoryData.category;
}

function resetFormAndResult() {
  // Reset input fields and result panel to default screen state.
  form.reset();
  selectedUnit = "metric";
  updateInputLabels(selectedUnit);
  clearMessage();

  resultCard.classList.add("hidden");
  resultCard.classList.remove("underweight", "normal", "overweight", "obese");
  resultName.textContent = "";
  bmiValue.textContent = "0.00";
  bmiCategory.textContent = "-";
}

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const nameValue = nameInput.value.trim();
  const heightValue = getPositiveNumber(heightInput.value);
  const weightValue = getPositiveNumber(weightInput.value);

  if (!nameValue) {
    setMessage("Please enter your name.", "error");
    return;
  }

  if (!heightValue || !weightValue) {
    setMessage("Height and weight must be positive numbers.", "error");
    return;
  }

  const converter = unitConfig[selectedUnit].toMetric;
  // Convert both unit systems to metric before applying BMI formula.
  const metricValues = converter(heightValue, weightValue);

  if (metricValues.heightInMeters <= 0 || metricValues.weightInKg <= 0) {
    setMessage("Please enter valid positive values.", "error");
    return;
  }

  const bmi = metricValues.weightInKg / (metricValues.heightInMeters ** 2);
  const roundedBmi = Number.parseFloat(bmi.toFixed(2));
  const categoryData = findCategory(roundedBmi);

  if (!categoryData) {
    setMessage("Could not calculate category. Try again.", "error");
    return;
  }

  showResult(nameValue, roundedBmi, categoryData);
  setMessage("BMI calculated successfully.", "success");

  bmiHistory.push({
    name: nameValue,
    bmi: roundedBmi.toFixed(2),
    category: categoryData.category,
    mode: selectedUnit === "metric" ? "cm/kg" : "ft/lbs",
    createdAt: new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  });

  saveHistory();
  renderHistory();
});

form.addEventListener("change", function (event) {
  if (event.target.name !== "unitType") {
    return;
  }

  selectedUnit = event.target.value;
  updateInputLabels(selectedUnit);
  clearMessage();
});

resetBtn.addEventListener("click", function () {
  resetFormAndResult();
});

clearHistoryBtn.addEventListener("click", function () {
  // Optional helper for bonus requirement to wipe old saved records.
  bmiHistory = [];
  saveHistory();
  renderHistory();
  setMessage("History cleared.", "success");
});

renderCategoryTable();
renderHistory();
updateInputLabels(selectedUnit);
const HISTORY_STORAGE_KEY = "bmiHistory";

// Kept in one place so both table and calculation logic use same ranges.
const bmiCategories = [
  {
    min: 0,
    max: 18.49,
    rangeLabel: "Below 18.5",
    category: "Underweight",
    className: "underweight",
  },
  {
    min: 18.5,
    max: 24.9,
    rangeLabel: "18.5 - 24.9",
    category: "Normal weight",
    className: "normal",
  },
  {
    min: 25,
    max: 29.9,
    rangeLabel: "25 - 29.9",
    category: "Overweight",
    className: "overweight",
  },
  {
    min: 30,
    max: Number.POSITIVE_INFINITY,
    rangeLabel: "30 and above",
    category: "Obese",
    className: "obese",
  },
];

const unitConfig = {
  metric: {
    heightLabel: "Height (cm)",
    weightLabel: "Weight (kg)",
    heightPlaceholder: "e.g. 170",
    weightPlaceholder: "e.g. 65",
    toMetric(height, weight) {
      return {
        heightInMeters: height / 100,
        weightInKg: weight,
      };
    },
  },
  imperial: {
    heightLabel: "Height (ft)",
    weightLabel: "Weight (lbs)",
    heightPlaceholder: "e.g. 5.8",
    weightPlaceholder: "e.g. 154",
    toMetric(height, weight) {
      return {
        heightInMeters: height * 0.3048,
        weightInKg: weight * 0.45359237,
      };
    },
  },
};

const form = document.querySelector("#bmiForm");
const nameInput = document.querySelector("#personName");
const heightInput = document.querySelector("#height");
const weightInput = document.querySelector("#weight");
const heightLabel = document.querySelector("#heightLabel");
const weightLabel = document.querySelector("#weightLabel");
const resetBtn = document.querySelector("#resetBtn");
const clearHistoryBtn = document.querySelector("#clearHistoryBtn");
const formMessage = document.querySelector("#formMessage");

const resultCard = document.querySelector("#resultCard");
const resultName = document.querySelector("#resultName");
const bmiValue = document.querySelector("#bmiValue");
const bmiCategory = document.querySelector("#bmiCategory");

const categoryRows = document.querySelector("#categoryRows");
const historyList = document.querySelector("#historyList");

// App state: currently selected unit and saved history list.
let selectedUnit = "metric";
let bmiHistory = loadHistory();

function loadHistory() {
  try {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch (error) {
    console.error("Failed to read local history:", error);
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(bmiHistory));
}

function setMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
}

function clearMessage() {
  formMessage.textContent = "";
  formMessage.className = "form-message";
}

function getPositiveNumber(value) {
  // Convert input string to number and reject empty/negative/zero values.
  const parsedValue = Number.parseFloat(value);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function findCategory(bmi) {
  return bmiCategories.find((item) => bmi >= item.min && bmi <= item.max);
}

function renderCategoryTable() {
  categoryRows.innerHTML = bmiCategories
    .map(
      (item) => `
        <tr>
          <td>${item.rangeLabel}</td>
          <td>${item.category}</td>
        </tr>
      `
    )
    .join("");
}

function renderHistory() {
  if (!bmiHistory.length) {
    historyList.innerHTML = `<li class="history-empty">No calculations yet.</li>`;
    return;
  }

  historyList.innerHTML = bmiHistory
    .slice()
    .reverse()
    .map(
      (entry) => `
        <li>
          <strong>${entry.name}</strong> - BMI ${entry.bmi} (${entry.category})
          <br />
          <small>${entry.mode} | ${entry.createdAt}</small>
        </li>
      `
    )
    .join("");
}

function updateInputLabels(unitType) {
  // Reuse config so labels/placeholders automatically match selected units.
  const selectedConfig = unitConfig[unitType];
  heightLabel.textContent = selectedConfig.heightLabel;
  weightLabel.textContent = selectedConfig.weightLabel;
  heightInput.placeholder = selectedConfig.heightPlaceholder;
  weightInput.placeholder = selectedConfig.weightPlaceholder;
}

function showResult(userName, bmi, categoryData) {
  resultCard.classList.remove("hidden");

  // Clear old category class first so color updates correctly each time.
  resultCard.classList.remove("underweight", "normal", "overweight", "obese");
  resultCard.classList.add(categoryData.className);

  resultName.textContent = `Name: ${userName}`;
  bmiValue.textContent = bmi.toFixed(2);
  bmiCategory.textContent = categoryData.category;
}

function resetFormAndResult() {
  // Reset input fields and result panel to default screen state.
  form.reset();
  selectedUnit = "metric";
  updateInputLabels(selectedUnit);
  clearMessage();

  resultCard.classList.add("hidden");
  resultCard.classList.remove("underweight", "normal", "overweight", "obese");
  resultName.textContent = "";
  bmiValue.textContent = "0.00";
  bmiCategory.textContent = "-";
}

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const nameValue = nameInput.value.trim();
  const heightValue = getPositiveNumber(heightInput.value);
  const weightValue = getPositiveNumber(weightInput.value);

  if (!nameValue) {
    setMessage("Please enter your name.", "error");
    return;
  }

  if (!heightValue || !weightValue) {
    setMessage("Height and weight must be positive numbers.", "error");
    return;
  }

  const converter = unitConfig[selectedUnit].toMetric;
  // Convert both unit systems to metric before applying BMI formula.
  const metricValues = converter(heightValue, weightValue);

  if (metricValues.heightInMeters <= 0 || metricValues.weightInKg <= 0) {
    setMessage("Please enter valid positive values.", "error");
    return;
  }

  const bmi = metricValues.weightInKg / (metricValues.heightInMeters ** 2);
  const roundedBmi = Number.parseFloat(bmi.toFixed(2));
  const categoryData = findCategory(roundedBmi);

  if (!categoryData) {
    setMessage("Could not calculate category. Try again.", "error");
    return;
  }

  showResult(nameValue, roundedBmi, categoryData);
  setMessage("BMI calculated successfully.", "success");

  bmiHistory.push({
    name: nameValue,
    bmi: roundedBmi.toFixed(2),
    category: categoryData.category,
    mode: selectedUnit === "metric" ? "cm/kg" : "ft/lbs",
    createdAt: new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  });

  saveHistory();
  renderHistory();
});

form.addEventListener("change", function (event) {
  if (event.target.name !== "unitType") {
    return;
  }

  selectedUnit = event.target.value;
  updateInputLabels(selectedUnit);
  clearMessage();
});

resetBtn.addEventListener("click", function () {
  resetFormAndResult();
});

clearHistoryBtn.addEventListener("click", function () {
  // Optional helper for bonus requirement to wipe old saved records.
  bmiHistory = [];
  saveHistory();
  renderHistory();
  setMessage("History cleared.", "success");
});

renderCategoryTable();
renderHistory();
updateInputLabels(selectedUnit);
const HISTORY_STORAGE_KEY = "bmiHistory";

// Kept in one place so both table and calculation logic use same ranges.
const bmiCategories = [
  {
    min: 0,
    max: 18.49,
    rangeLabel: "Below 18.5",
    category: "Underweight",
    className: "underweight",
  },
  {
    min: 18.5,
    max: 24.9,
    rangeLabel: "18.5 - 24.9",
    category: "Normal weight",
    className: "normal",
  },
  {
    min: 25,
    max: 29.9,
    rangeLabel: "25 - 29.9",
    category: "Overweight",
    className: "overweight",
  },
  {
    min: 30,
    max: Number.POSITIVE_INFINITY,
    rangeLabel: "30 and above",
    category: "Obese",
    className: "obese",
  },
];

const unitConfig = {
  metric: {
    heightLabel: "Height (cm)",
    weightLabel: "Weight (kg)",
    heightPlaceholder: "e.g. 170",
    weightPlaceholder: "e.g. 65",
    toMetric(height, weight) {
      return {
        heightInMeters: height / 100,
        weightInKg: weight,
      };
    },
  },
  imperial: {
    heightLabel: "Height (ft)",
    weightLabel: "Weight (lbs)",
    heightPlaceholder: "e.g. 5.8",
    weightPlaceholder: "e.g. 154",
    toMetric(height, weight) {
      return {
        heightInMeters: height * 0.3048,
        weightInKg: weight * 0.45359237,
      };
    },
  },
};

const form = document.querySelector("#bmiForm");
const nameInput = document.querySelector("#personName");
const heightInput = document.querySelector("#height");
const weightInput = document.querySelector("#weight");
const heightLabel = document.querySelector("#heightLabel");
const weightLabel = document.querySelector("#weightLabel");
const resetBtn = document.querySelector("#resetBtn");
const clearHistoryBtn = document.querySelector("#clearHistoryBtn");
const formMessage = document.querySelector("#formMessage");

const resultCard = document.querySelector("#resultCard");
const resultName = document.querySelector("#resultName");
const bmiValue = document.querySelector("#bmiValue");
const bmiCategory = document.querySelector("#bmiCategory");

const categoryRows = document.querySelector("#categoryRows");
const historyList = document.querySelector("#historyList");

// App state: currently selected unit and saved history list.
let selectedUnit = "metric";
let bmiHistory = loadHistory();

function loadHistory() {
  try {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch (error) {
    console.error("Failed to read local history:", error);
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(bmiHistory));
}

function setMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
}

function clearMessage() {
  formMessage.textContent = "";
  formMessage.className = "form-message";
}

function getPositiveNumber(value) {
  // Convert input string to number and reject empty/negative/zero values.
  const parsedValue = Number.parseFloat(value);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function findCategory(bmi) {
  return bmiCategories.find((item) => bmi >= item.min && bmi <= item.max);
}

function renderCategoryTable() {
  categoryRows.innerHTML = bmiCategories
    .map(
      (item) => `
        <tr>
          <td>${item.rangeLabel}</td>
          <td>${item.category}</td>
        </tr>
      `
    )
    .join("");
}

function renderHistory() {
  if (!bmiHistory.length) {
    historyList.innerHTML = `<li class="history-empty">No calculations yet.</li>`;
    return;
  }

  historyList.innerHTML = bmiHistory
    .slice()
    .reverse()
    .map(
      (entry) => `
        <li>
          <strong>${entry.name}</strong> - BMI ${entry.bmi} (${entry.category})
          <br />
          <small>${entry.mode} | ${entry.createdAt}</small>
        </li>
      `
    )
    .join("");
}

function updateInputLabels(unitType) {
  // Reuse config so labels/placeholders automatically match selected units.
  const selectedConfig = unitConfig[unitType];
  heightLabel.textContent = selectedConfig.heightLabel;
  weightLabel.textContent = selectedConfig.weightLabel;
  heightInput.placeholder = selectedConfig.heightPlaceholder;
  weightInput.placeholder = selectedConfig.weightPlaceholder;
}

function showResult(userName, bmi, categoryData) {
  resultCard.classList.remove("hidden");

  // Clear old category class first so color updates correctly each time.
  resultCard.classList.remove("underweight", "normal", "overweight", "obese");
  resultCard.classList.add(categoryData.className);

  resultName.textContent = `Name: ${userName}`;
  bmiValue.textContent = bmi.toFixed(2);
  bmiCategory.textContent = categoryData.category;
}

function resetFormAndResult() {
  // Reset input fields and result panel to default screen state.
  form.reset();
  selectedUnit = "metric";
  updateInputLabels(selectedUnit);
  clearMessage();

  resultCard.classList.add("hidden");
  resultCard.classList.remove("underweight", "normal", "overweight", "obese");
  resultName.textContent = "";
  bmiValue.textContent = "0.00";
  bmiCategory.textContent = "-";
}

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const nameValue = nameInput.value.trim();
  const heightValue = getPositiveNumber(heightInput.value);
  const weightValue = getPositiveNumber(weightInput.value);

  if (!nameValue) {
    setMessage("Please enter your name.", "error");
    return;
  }

  if (!heightValue || !weightValue) {
    setMessage("Height and weight must be positive numbers.", "error");
    return;
  }

  const converter = unitConfig[selectedUnit].toMetric;
  // Convert both unit systems to metric before applying BMI formula.
  const metricValues = converter(heightValue, weightValue);

  if (metricValues.heightInMeters <= 0 || metricValues.weightInKg <= 0) {
    setMessage("Please enter valid positive values.", "error");
    return;
  }

  const bmi = metricValues.weightInKg / (metricValues.heightInMeters ** 2);
  const roundedBmi = Number.parseFloat(bmi.toFixed(2));
  const categoryData = findCategory(roundedBmi);

  if (!categoryData) {
    setMessage("Could not calculate category. Try again.", "error");
    return;
  }

  showResult(nameValue, roundedBmi, categoryData);
  setMessage("BMI calculated successfully.", "success");

  bmiHistory.push({
    name: nameValue,
    bmi: roundedBmi.toFixed(2),
    category: categoryData.category,
    mode: selectedUnit === "metric" ? "cm/kg" : "ft/lbs",
    createdAt: new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  });

  saveHistory();
  renderHistory();
});

form.addEventListener("change", function (event) {
  if (event.target.name !== "unitType") {
    return;
  }

  selectedUnit = event.target.value;
  updateInputLabels(selectedUnit);
  clearMessage();
});

resetBtn.addEventListener("click", function () {
  resetFormAndResult();
});

clearHistoryBtn.addEventListener("click", function () {
  // Optional helper for bonus requirement to wipe old saved records.
  bmiHistory = [];
  saveHistory();
  renderHistory();
  setMessage("History cleared.", "success");
});

renderCategoryTable();
renderHistory();
updateInputLabels(selectedUnit);
const HISTORY_STORAGE_KEY = "bmiHistory";

// Kept in one place so both table and calculation logic use same ranges.
const bmiCategories = [
  {
    min: 0,
    max: 18.49,
    rangeLabel: "Below 18.5",
    category: "Underweight",
    className: "underweight",
  },
  {
    min: 18.5,
    max: 24.9,
    rangeLabel: "18.5 - 24.9",
    category: "Normal weight",
    className: "normal",
  },
  {
    min: 25,
    max: 29.9,
    rangeLabel: "25 - 29.9",
    category: "Overweight",
    className: "overweight",
  },
  {
    min: 30,
    max: Number.POSITIVE_INFINITY,
    rangeLabel: "30 and above",
    category: "Obese",
    className: "obese",
  },
];

const unitConfig = {
  metric: {
    heightLabel: "Height (cm)",
    weightLabel: "Weight (kg)",
    heightPlaceholder: "e.g. 170",
    weightPlaceholder: "e.g. 65",
    toMetric(height, weight) {
      return {
        heightInMeters: height / 100,
        weightInKg: weight,
      };
    },
  },
  imperial: {
    heightLabel: "Height (ft)",
    weightLabel: "Weight (lbs)",
    heightPlaceholder: "e.g. 5.8",
    weightPlaceholder: "e.g. 154",
    toMetric(height, weight) {
      return {
        heightInMeters: height * 0.3048,
        weightInKg: weight * 0.45359237,
      };
    },
  },
};

const form = document.querySelector("#bmiForm");
const nameInput = document.querySelector("#personName");
const heightInput = document.querySelector("#height");
const weightInput = document.querySelector("#weight");
const heightLabel = document.querySelector("#heightLabel");
const weightLabel = document.querySelector("#weightLabel");
const resetBtn = document.querySelector("#resetBtn");
const clearHistoryBtn = document.querySelector("#clearHistoryBtn");
const formMessage = document.querySelector("#formMessage");

const resultCard = document.querySelector("#resultCard");
const resultName = document.querySelector("#resultName");
const bmiValue = document.querySelector("#bmiValue");
const bmiCategory = document.querySelector("#bmiCategory");

const categoryRows = document.querySelector("#categoryRows");
const historyList = document.querySelector("#historyList");

// App state: currently selected unit and saved history list.
let selectedUnit = "metric";
let bmiHistory = loadHistory();

function loadHistory() {
  try {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch (error) {
    console.error("Failed to read local history:", error);
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(bmiHistory));
}

function setMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
}

function clearMessage() {
  formMessage.textContent = "";
  formMessage.className = "form-message";
}

function getPositiveNumber(value) {
  // Convert input string to number and reject empty/negative/zero values.
  const parsedValue = Number.parseFloat(value);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function findCategory(bmi) {
  return bmiCategories.find((item) => bmi >= item.min && bmi <= item.max);
}

function renderCategoryTable() {
  categoryRows.innerHTML = bmiCategories
    .map(
      (item) => `
        <tr>
          <td>${item.rangeLabel}</td>
          <td>${item.category}</td>
        </tr>
      `
    )
    .join("");
}

function renderHistory() {
  if (!bmiHistory.length) {
    historyList.innerHTML = `<li class="history-empty">No calculations yet.</li>`;
    return;
  }

  historyList.innerHTML = bmiHistory
    .slice()
    .reverse()
    .map(
      (entry) => `
        <li>
          <strong>${entry.name}</strong> - BMI ${entry.bmi} (${entry.category})
          <br />
          <small>${entry.mode} | ${entry.createdAt}</small>
        </li>
      `
    )
    .join("");
}

function updateInputLabels(unitType) {
  // Reuse config so labels/placeholders automatically match selected units.
  const selectedConfig = unitConfig[unitType];
  heightLabel.textContent = selectedConfig.heightLabel;
  weightLabel.textContent = selectedConfig.weightLabel;
  heightInput.placeholder = selectedConfig.heightPlaceholder;
  weightInput.placeholder = selectedConfig.weightPlaceholder;
}

function showResult(userName, bmi, categoryData) {
  resultCard.classList.remove("hidden");

  // Clear old category class first so color updates correctly each time.
  resultCard.classList.remove("underweight", "normal", "overweight", "obese");
  resultCard.classList.add(categoryData.className);

  resultName.textContent = `Name: ${userName}`;
  bmiValue.textContent = bmi.toFixed(2);
  bmiCategory.textContent = categoryData.category;
}

function resetFormAndResult() {
  // Reset input fields and result panel to default screen state.
  form.reset();
  selectedUnit = "metric";
  updateInputLabels(selectedUnit);
  clearMessage();

  resultCard.classList.add("hidden");
  resultCard.classList.remove("underweight", "normal", "overweight", "obese");
  resultName.textContent = "";
  bmiValue.textContent = "0.00";
  bmiCategory.textContent = "-";
}

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const nameValue = nameInput.value.trim();
  const heightValue = getPositiveNumber(heightInput.value);
  const weightValue = getPositiveNumber(weightInput.value);

  if (!nameValue) {
    setMessage("Please enter your name.", "error");
    return;
  }

  if (!heightValue || !weightValue) {
    setMessage("Height and weight must be positive numbers.", "error");
    return;
  }

  const converter = unitConfig[selectedUnit].toMetric;
  // Convert both unit systems to metric before applying BMI formula.
  const metricValues = converter(heightValue, weightValue);

  if (metricValues.heightInMeters <= 0 || metricValues.weightInKg <= 0) {
    setMessage("Please enter valid positive values.", "error");
    return;
  }

  const bmi = metricValues.weightInKg / (metricValues.heightInMeters ** 2);
  const roundedBmi = Number.parseFloat(bmi.toFixed(2));
  const categoryData = findCategory(roundedBmi);

  if (!categoryData) {
    setMessage("Could not calculate category. Try again.", "error");
    return;
  }

  showResult(nameValue, roundedBmi, categoryData);
  setMessage("BMI calculated successfully.", "success");

  bmiHistory.push({
    name: nameValue,
    bmi: roundedBmi.toFixed(2),
    category: categoryData.category,
    mode: selectedUnit === "metric" ? "cm/kg" : "ft/lbs",
    createdAt: new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  });

  saveHistory();
  renderHistory();
});

form.addEventListener("change", function (event) {
  if (event.target.name !== "unitType") {
    return;
  }

  selectedUnit = event.target.value;
  updateInputLabels(selectedUnit);
  clearMessage();
});

resetBtn.addEventListener("click", function () {
  resetFormAndResult();
});

clearHistoryBtn.addEventListener("click", function () {
  // Optional helper for bonus requirement to wipe old saved records.
  bmiHistory = [];
  saveHistory();
  renderHistory();
  setMessage("History cleared.", "success");
});

renderCategoryTable();
renderHistory();
updateInputLabels(selectedUnit);
