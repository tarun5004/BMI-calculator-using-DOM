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
