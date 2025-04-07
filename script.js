let timerInterval = null;
let elapsedTime = 0;

// ----- Days and Global Variables -----
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// DOM References
const daySelector = document.getElementById("daySelector");
const workoutForm = document.getElementById("workoutForm");        // Strength form
const cardioForm = document.getElementById("cardioForm");            // Cardio form
const workoutList = document.getElementById("workoutList");
const restDayCheckbox = document.getElementById("restDayCheckbox");

// Strength Edit Modal Elements
const strengthEditModal = document.getElementById("strengthEditModal");
const closeStrengthModal = document.getElementById("closeStrengthModal");
const modalStrengthExercise = document.getElementById("modalStrengthExercise");
const modalStrengthSets = document.getElementById("modalStrengthSets");
const modalStrengthReps = document.getElementById("modalStrengthReps");
const modalStrengthWeight = document.getElementById("modalStrengthWeight");
const modalStrengthSaveButton = document.getElementById("modalStrengthSaveButton");
const modalStrengthCancelButton = document.getElementById("modalStrengthCancelButton");

// Cardio Edit Modal Elements
const cardioEditModal = document.getElementById("cardioEditModal");
const closeCardioModal = document.getElementById("closeCardioModal");
const modalCardioExercise = document.getElementById("modalCardioExercise");
const modalCardioMinutes = document.getElementById("modalCardioMinutes");
const modalCardioSeconds = document.getElementById("modalCardioSeconds");
const modalCardioDistance = document.getElementById("modalCardioDistance");
const modalCardioSaveButton = document.getElementById("modalCardioSaveButton");
const modalCardioCancelButton = document.getElementById("modalCardioCancelButton");

// Toggle Buttons for Exercise Type
const strengthButton = document.getElementById("strengthBtn");
const cardioButton = document.getElementById("cardioBtn");

// Timer Modal and Elements (unchanged)
const openTimer = document.getElementById('openTimer');
const timerModal = document.getElementById('timerModal');
const closeTimer = document.getElementById('closeTimer');
const timerDisplay = document.getElementById('timerDisplay');
const toggleTimer = document.getElementById('toggleTimer');
const resetTimer = document.getElementById('resetTimer');

// Global state for editing
let currentEditIndex = null;
let currentEditType = null; // 'strength' or 'cardio'

// Data structure: each day now holds separate arrays for strength and cardio
let weeklyWorkouts = {};

// ----- Data Loading & Local Storage -----
function loadWeeklyWorkouts() {
  const storedData = localStorage.getItem("weeklyWorkouts");
  if (storedData) {
    weeklyWorkouts = JSON.parse(storedData);
    
    // Loop through each day and check if the old structure exists.
    // Assume that if the 'strength' property is missing but 'workouts' exists,
    // then the old structure is in use.
    for (const day in weeklyWorkouts) {
      if (!weeklyWorkouts[day].strength && weeklyWorkouts[day].workouts) {
        // Convert old 'workouts' array to the new structure:
        weeklyWorkouts[day].strength = weeklyWorkouts[day].workouts;
        weeklyWorkouts[day].cardio = [];  // Initialize cardio array as empty
        delete weeklyWorkouts[day].workouts;
      }
      // Ensure that both 'strength' and 'cardio' exist.
      if (!weeklyWorkouts[day].strength) {
        weeklyWorkouts[day].strength = [];
      }
      if (!weeklyWorkouts[day].cardio) {
        weeklyWorkouts[day].cardio = [];
      }
    }
  } else {
    // Initialize new data structure if nothing is in localStorage
    daysOfWeek.forEach(day => {
      weeklyWorkouts[day] = {
        strength: [],
        cardio: [],
        isRestDay: false
      };
    });
  }
}

function updateLocalStorage() {
  localStorage.setItem("weeklyWorkouts", JSON.stringify(weeklyWorkouts));
}

// Default current selected day (using dayNames to match JS getDay() index)
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
let currentDay = dayNames[new Date().getDay()];

// ----- Rendering Workouts -----
function renderWorkouts() {
  const dayData = weeklyWorkouts[currentDay];
  
  // Update rest day checkbox state
  restDayCheckbox.checked = dayData.isRestDay;
  
  // If it's a rest day, show a message and hide both forms
  if(dayData.isRestDay) {
    workoutList.innerHTML = '<p>This is a rest day. Enjoy your break!</p>';
    workoutForm.style.display = 'none';
    cardioForm.style.display = 'none';
    strengthButton.style.display = 'none';
    cardioButton.style.display = 'none';
    openTimer.style.display = 'none';
  } else {
    // Show the toggle buttons and timer button when it's not a rest day
    strengthButton.style.display = 'inline-block';
    cardioButton.style.display = 'inline-block';
    openTimer.style.display = 'inline-block';

    // Show the correct form based on the active toggle
    workoutForm.style.display = strengthButton.classList.contains('active') ? 'flex' : 'none';
    cardioForm.style.display = cardioButton.classList.contains('active') ? 'flex' : 'none';
    
    workoutList.innerHTML = "";
    
    // Render Strength Workouts
    dayData.strength.forEach((workout, index) => {
      const li = document.createElement("li");
      li.setAttribute("data-index", index);
      li.innerHTML = `
        <span>
          <input type="checkbox" class="doneCheckbox" ${workout.done ? "checked" : ""} data-index="${index}" data-type="strength">
          <strong>${workout.exercise}</strong> – 
          <span class="sets">${workout.sets}</span> sets x 
          <span class="reps">${workout.reps}</span> reps @ 
          <span class="weight">${workout.weight}</span> KG
        </span>
        <div class="workout-actions">
          <button class="editButton" data-index="${index}" data-type="strength">Edit</button>
          <button class="deleteButton" data-index="${index}" data-type="strength">Delete</button>
        </div>
      `;
      workoutList.appendChild(li);
    });
    
    // Render Cardio Workouts
    dayData.cardio.forEach((workout, index) => {
      const li = document.createElement("li");
      li.setAttribute("data-index", index);
      li.innerHTML = `
        <span>
          <input type="checkbox" class="doneCheckbox" ${workout.done ? "checked" : ""} data-index="${index}" data-type="cardio">
          <strong>${workout.exercise}</strong> – 
          <span class="duration">${workout.minutes}minutes ${workout.seconds}seconds</span> @ 
          <span class="distance">${workout.distance}</span> km
        </span>
        <div class="workout-actions">
          <button class="editButton" data-index="${index}" data-type="cardio">Edit</button>
          <button class="deleteButton" data-index="${index}" data-type="cardio">Delete</button>
        </div>
      `;
      workoutList.appendChild(li);
    });
  }
}

// Update active day button appearance
function updateDaySelector() {
  const buttons = daySelector.querySelectorAll("button");
  buttons.forEach(button => {
    if (button.getAttribute("data-day") === currentDay) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}

// ----- Initialization -----
window.addEventListener("load", () => {
  loadWeeklyWorkouts();
  resetDoneStatusIfNewDay();
  renderWorkouts();
  updateDaySelector();
  // Only call showStrength() if it's not a rest day:
  if (!weeklyWorkouts[currentDay].isRestDay) {
    showStrength(); // By default set to strength form
  }
});

// ----- Day Selector & Rest Day Toggle -----
daySelector.addEventListener("click", (e) => {
  if(e.target.tagName === "BUTTON") {
    currentDay = e.target.getAttribute("data-day");
    renderWorkouts();
    updateDaySelector();
  }
});

restDayCheckbox.addEventListener("change", function(e) {
  weeklyWorkouts[currentDay].isRestDay = e.target.checked;
  updateLocalStorage();
  renderWorkouts();
});

// ----- Form Submissions -----
// Strength Form Submission
workoutForm.addEventListener("submit", function(e) {
  e.preventDefault();
  if(weeklyWorkouts[currentDay].isRestDay) return;
  
  const exercise = document.getElementById("exercise").value;
  const sets = document.getElementById("sets").value;
  const reps = document.getElementById("reps").value;
  const weight = document.getElementById("weight").value;
  
  weeklyWorkouts[currentDay].strength.push({
    exercise,
    sets,
    reps,
    weight,
    done: false,
    type: 'strength'
  });
  
  updateLocalStorage();
  renderWorkouts();
  workoutForm.reset();
});

// Cardio Form Submission
cardioForm.addEventListener("submit", function(e) {
  e.preventDefault();
  if(weeklyWorkouts[currentDay].isRestDay) return;
  
  const exercise = document.getElementById("cardioExercise").value;
  const minutes = document.getElementById("cardioDurationMinutes").value;
  const seconds = document.getElementById("cardioDurationSeconds").value;
  const distance = document.getElementById("cardioDistance").value;
  
  weeklyWorkouts[currentDay].cardio.push({
    exercise,
    minutes,
    seconds,
    distance,
    done: false,
    type: 'cardio'
  });
  
  updateLocalStorage();
  renderWorkouts();
  cardioForm.reset();
});

// ----- Workout List Event Delegation for Edit & Delete -----
workoutList.addEventListener("click", function(e) {
  const target = e.target;
  const index = target.getAttribute("data-index");
  const type = target.getAttribute("data-type");
  
  let dayWorkouts;
  if (type === 'strength') {
    dayWorkouts = weeklyWorkouts[currentDay].strength;
  } else if (type === 'cardio') {
    dayWorkouts = weeklyWorkouts[currentDay].cardio;
  }
  
  // Toggle done status
  if(target.classList.contains("doneCheckbox")) {
    dayWorkouts[index].done = target.checked;
    updateLocalStorage();
    return;
  }
  
  // Editing: open the appropriate modal with current data
  if(target.classList.contains("editButton")) {
    currentEditIndex = index;
    currentEditType = type;
    
    if(type === 'strength') {
      const workout = dayWorkouts[index];
      modalStrengthExercise.value = workout.exercise;
      modalStrengthSets.value = workout.sets;
      modalStrengthReps.value = workout.reps;
      modalStrengthWeight.value = workout.weight;
      strengthEditModal.style.display = "block";
    } else if (type === 'cardio') {
      const workout = dayWorkouts[index];
      modalCardioExercise.value = workout.exercise;
      modalCardioMinutes.value = workout.minutes;
      modalCardioSeconds.value = workout.seconds;
      modalCardioDistance.value = workout.distance;
      cardioEditModal.style.display = "block";
    }
    return;
  }
  
  // Deletion
  if(target.classList.contains("deleteButton")) {
    if (confirm("Are you sure you want to delete this workout?")) {
      dayWorkouts.splice(index, 1);
      updateLocalStorage();
      renderWorkouts();
    }
    return;
  }
});

// ----- Strength Modal Event Handlers -----
modalStrengthSaveButton.addEventListener("click", () => {
  const index = currentEditIndex;
  let workout = weeklyWorkouts[currentDay].strength[index];
  workout.exercise = modalStrengthExercise.value;
  workout.sets = modalStrengthSets.value;
  workout.reps = modalStrengthReps.value;
  workout.weight = modalStrengthWeight.value;
  updateLocalStorage();
  renderWorkouts();
  strengthEditModal.style.display = "none";
  currentEditIndex = null;
});

modalStrengthCancelButton.addEventListener("click", () => {
  strengthEditModal.style.display = "none";
  currentEditIndex = null;
});

closeStrengthModal.addEventListener("click", () => {
  strengthEditModal.style.display = "none";
});

// ----- Cardio Modal Event Handlers -----
modalCardioSaveButton.addEventListener("click", () => {
  const index = currentEditIndex;
  let workout = weeklyWorkouts[currentDay].cardio[index];
  workout.exercise = modalCardioExercise.value;
  workout.minutes = modalCardioMinutes.value;
  workout.seconds = modalCardioSeconds.value;
  workout.distance = modalCardioDistance.value;
  updateLocalStorage();
  renderWorkouts();
  cardioEditModal.style.display = "none";
  currentEditIndex = null;
});

modalCardioCancelButton.addEventListener("click", () => {
  cardioEditModal.style.display = "none";
  currentEditIndex = null;
});

closeCardioModal.addEventListener("click", () => {
  cardioEditModal.style.display = "none";
});

// ----- Optional: Close Modals When Clicking Outside -----
window.addEventListener("click", (e) => {
  if(e.target === strengthEditModal) {
    strengthEditModal.style.display = "none";
  }
  if(e.target === cardioEditModal) {
    cardioEditModal.style.display = "none";
  }
});

// ----- Reset 'done' Status if a New Day has Started -----
function resetDoneStatusIfNewDay() {
  const today = new Date().toLocaleDateString();
  const lastDate = localStorage.getItem("lastDate");
  
  if (lastDate !== today) {
    for (const day in weeklyWorkouts) {
      weeklyWorkouts[day].strength.forEach(workout => workout.done = false);
      weeklyWorkouts[day].cardio.forEach(workout => workout.done = false);
    }
    localStorage.setItem("lastDate", today);
    updateLocalStorage();
  }
}

openTimer.addEventListener('click', () => {
  timerModal.style.display = 'block';
});

closeTimer.addEventListener('click', () => {
  timerModal.style.display = 'none';
});

// ----- Timer Functionality (unchanged) -----
function updateDisplay() {
  const totalSeconds = Math.floor(elapsedTime / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const hundredths = String(Math.floor((elapsedTime % 1000) / 10)).padStart(2, '0');
  timerDisplay.innerText = `${hours}:${minutes}:${seconds}.${hundredths}`;
}

function startStopwatch() {
  const startTime = Date.now() - elapsedTime;
  timerInterval = setInterval(() => {
    elapsedTime = Date.now() - startTime;
    updateDisplay();
  }, 10);
}

function pauseStopwatch() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetStopwatch() {
  pauseStopwatch();
  elapsedTime = 0;
  updateDisplay();
  toggleTimer.classList.remove('pause');
  toggleTimer.innerText = 'Start';
}

toggleTimer.addEventListener('click', () => {
  if (timerInterval === null) {
    startStopwatch();
    toggleTimer.innerText = 'Pause';
    toggleTimer.classList.add('pause');
  } else {
    pauseStopwatch();
    toggleTimer.innerText = 'Start';
    toggleTimer.classList.remove('pause');
  }
});

resetTimer.addEventListener('click', () => {
  resetStopwatch();
});

// ----- Toggle Between Strength and Cardio Forms -----
function showStrength() {
  strengthButton.classList.add('active');
  cardioButton.classList.remove('active');
  workoutForm.style.display = 'flex';
  cardioForm.style.display = 'none';
}

function showCardio() {
  cardioButton.classList.add('active');
  strengthButton.classList.remove('active');
  cardioForm.style.display = 'flex';
  workoutForm.style.display = 'none';
}

strengthButton.addEventListener('click', showStrength);
cardioButton.addEventListener('click', showCardio);