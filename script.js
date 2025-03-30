// Define days of the week
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Get references to DOM elements
const daySelector = document.getElementById("daySelector");
const workoutForm = document.getElementById("workoutForm");
const workoutList = document.getElementById("workoutList");
const restDayCheckbox = document.getElementById("restDayCheckbox");

// Modal elements for editing
const editModal = document.getElementById("editModal");
const closeModal = document.getElementById("closeModal");
const modalExercise = document.getElementById("modalExercise");
const modalSets = document.getElementById("modalSets");
const modalReps = document.getElementById("modalReps");
const modalWeight = document.getElementById("modalWeight");
const modalSaveButton = document.getElementById("modalSaveButton");
const modalCancelButton = document.getElementById("modalCancelButton");

// Object to hold weekly data for each day
let weeklyWorkouts = {};

// To track which workout is being edited
let currentEditIndex = null;

// Load workouts from localStorage or initialize data structure
function loadWeeklyWorkouts() {
  const storedData = localStorage.getItem("weeklyWorkouts");
  if (storedData) {
    weeklyWorkouts = JSON.parse(storedData);
  } else {
    daysOfWeek.forEach(day => {
      weeklyWorkouts[day] = {
        workouts: [],
        isRestDay: false
      };
    });
  }
}

// Save weekly workouts to localStorage
function updateLocalStorage() {
  localStorage.setItem("weeklyWorkouts", JSON.stringify(weeklyWorkouts));
}

// Default current selected day
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
let currentDay = dayNames[new Date().getDay()];

// Render workouts or rest day message for the current day
function renderWorkouts() {
  const dayData = weeklyWorkouts[currentDay];
  
  // Update the rest day checkbox state
  restDayCheckbox.checked = dayData.isRestDay;
  
  // If it's a rest day, hide the form and show a message; otherwise, show workouts
  if(dayData.isRestDay) {
    workoutList.innerHTML = '<p>This is a rest day. Enjoy your break!</p>';
    workoutForm.style.display = 'none';
  } else {
    workoutForm.style.display = 'flex';
    workoutList.innerHTML = "";
    dayData.workouts.forEach((workout, index) => {
      const li = document.createElement("li");
      li.setAttribute("data-index", index);
      li.innerHTML = `
        <span>
          <input type="checkbox" class="doneCheckbox" ${workout.done ? "checked" : ""} data-index="${index}">
          <strong>${workout.exercise}</strong> – 
          <span class="sets">${workout.sets}</span> sets x 
          <span class="reps">${workout.reps}</span> reps @ 
          <span class="weight">${workout.weight}</span> KG
        </span>
        <div class="workout-actions">
          <button class="editButton" data-index="${index}">Edit</button>
          <button class="deleteButton" data-index="${index}">Delete</button>
        </div>
      `;
      workoutList.appendChild(li);
    });
  }
}

// Update the active day button appearance
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

// On page load, initialize data and render the current day's info
window.addEventListener("load", () => {
  loadWeeklyWorkouts();
  resetDoneStatusIfNewDay();
  renderWorkouts();
  updateDaySelector();
});

// Handle day selection button clicks
daySelector.addEventListener("click", (e) => {
  if(e.target.tagName === "BUTTON") {
    currentDay = e.target.getAttribute("data-day");
    renderWorkouts();
    updateDaySelector();
  }
});

// Handle rest day checkbox toggle
restDayCheckbox.addEventListener("change", function(e) {
  weeklyWorkouts[currentDay].isRestDay = e.target.checked;
  updateLocalStorage();
  renderWorkouts();
});

// Handle form submission to add a new workout for the current day
workoutForm.addEventListener("submit", function(e) {
  e.preventDefault();
  
  // If the day is marked as a rest day, do not add workouts
  if(weeklyWorkouts[currentDay].isRestDay) return;
  
  const exercise = document.getElementById("exercise").value;
  const sets = document.getElementById("sets").value;
  const reps = document.getElementById("reps").value;
  const weight = document.getElementById("weight").value;
  
  // Add the new workout to the selected day's list
  weeklyWorkouts[currentDay].workouts.push({
    exercise,
    sets,
    reps,
    weight,
    done: false
  });
  
  updateLocalStorage();
  renderWorkouts();
  workoutForm.reset();
});

// Event delegation for workout list interactions (checkbox, edit, delete)
workoutList.addEventListener("click", function(e) {
  const target = e.target;
  const index = target.getAttribute("data-index");
  const dayWorkouts = weeklyWorkouts[currentDay].workouts;
  
  // Toggle workout done status
  if(target.classList.contains("doneCheckbox")) {
    dayWorkouts[index].done = target.checked;
    updateLocalStorage();
    return;
  }
  
  // Open modal for editing when clicking Edit
  if(target.classList.contains("editButton")) {
    currentEditIndex = index;
    const workout = dayWorkouts[index];
    // Populate modal fields with current workout data
    modalExercise.value = workout.exercise;
    modalSets.value = workout.sets;
    modalReps.value = workout.reps;
    modalWeight.value = workout.weight;
    
    // Show the modal
    editModal.style.display = "block";
    return;
  }
  
  // Handle deletion when clicking Delete
  if(target.classList.contains("deleteButton")) {
    if (confirm("Are you sure you want to delete this workout?")) {
      dayWorkouts.splice(index, 1);
      updateLocalStorage();
      renderWorkouts();
    }
    return;
  }
});

// Close modal when clicking the X or Cancel button
closeModal.addEventListener("click", () => {
  editModal.style.display = "none";
});
modalCancelButton.addEventListener("click", () => {
  editModal.style.display = "none";
});

// Save changes from the modal
modalSaveButton.addEventListener("click", () => {
  if (currentEditIndex === null) return;
  
  // Update workout details with values from modal fields
  const updatedWorkout = {
    ...weeklyWorkouts[currentDay].workouts[currentEditIndex],
    exercise: modalExercise.value,
    sets: modalSets.value,
    reps: modalReps.value,
    weight: modalWeight.value
  };
  weeklyWorkouts[currentDay].workouts[currentEditIndex] = updatedWorkout;
  updateLocalStorage();
  renderWorkouts();
  editModal.style.display = "none";
  
  // Reset the current edit index
  currentEditIndex = null;
});

// Optionally, close the modal if the user clicks outside the modal content
window.addEventListener("click", (e) => {
  if(e.target === editModal) {
    editModal.style.display = "none";
  }
});

// Function to reset 'done' status if a new day has started
function resetDoneStatusIfNewDay() {
    const today = new Date().toLocaleDateString();
    const lastDate = localStorage.getItem("lastDate");
    
    // If there's no stored date or it's different from today, reset checkboxes
    if (lastDate !== today) {
      // Loop through each day and reset the 'done' property for each workout
      for (const day in weeklyWorkouts) {
        weeklyWorkouts[day].workouts.forEach(workout => {
          workout.done = false;
        });
      }
      // Save the new date in localStorage
      localStorage.setItem("lastDate", today);
      // Update localStorage with the reset workouts
      updateLocalStorage();
    }
}

document.getElementById("copyrightYear").textContent = new Date().getFullYear();

// Modal functionality
const openTimer = document.getElementById('openTimer'); // Button to open modal (placed elsewhere)
const timerModal = document.getElementById('timerModal');
const closeTimer = document.getElementById('closeTimer');

openTimer.addEventListener('click', () => {
  timerModal.style.display = 'block';
});

closeTimer.addEventListener('click', () => {
  timerModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === timerModal) {
    timerModal.style.display = 'none';
  }
});

// Stopwatch functionality using two buttons
const timerDisplay = document.getElementById('timerDisplay');
const toggleTimer = document.getElementById('toggleTimer'); // This button toggles Start/Pause
const resetTimer = document.getElementById('resetTimer');

let timerInterval = null;
let elapsedTime = 0; // in milliseconds

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
  }, 10); // Update every 10ms for hundredths of a second
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
  toggleTimer.innerText = 'Start'; // Reset toggle button label to Start
}

// Toggle button event handler
toggleTimer.addEventListener('click', () => {
  if (timerInterval === null) {
    // Timer is not running: start it and change label to Pause
    startStopwatch();
    toggleTimer.innerText = 'Pause';
    toggleTimer.classList.add('pause');
  } else {
    // Timer is running: pause it and change label to Start
    pauseStopwatch();
    toggleTimer.innerText = 'Start';
    toggleTimer.classList.remove('pause');
  }
});

// Reset button event handler
resetTimer.addEventListener('click', () => {
  resetStopwatch();
});