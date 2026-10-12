document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("task-search")?.addEventListener("input", renderTasks);
    document.getElementById("task-status-filter")?.addEventListener("change", renderTasks);
    document.getElementById("task-priority-filter")?.addEventListener("change", renderTasks);
    
    const STORAGE_KEY = "devtask.tasks.v1";

    const taskList = document.querySelector("#task-list");
    const taskCount = document.querySelector("#task-count");
    const taskSummary = document.querySelector("#task-summary");

    const modal = document.querySelector("#task-modal");
    const openButton = document.querySelector("#create-task-button");
    const closeButton = document.querySelector("#close-task-modal");
    const cancelButton = document.querySelector("#cancel-task-modal");
    const form = document.querySelector("#task-form");
    const titleInput = document.querySelector("#task-title-input");

    const stats = {
        total: document.querySelector('[data-stat="total"]'),
        completed: document.querySelector('[data-stat="completed"]'),
        inProgress: document.querySelector('[data-stat="in-progress"]'),
        overdue: document.querySelector('[data-stat="overdue"]'),
    };

    const sampleTasks = [
        {
        id: "sample-1",
        title: "Design homepage dashboard",
        project: "Personal Website",
        priority: "High",
        due: "",
        completed: false,
        },
        {
        id: "sample-2",
        title: "Build authentication page",
        project: "DevTask",
        priority: "High",
        due: "",
        completed: false,
        },
        {
        id: "sample-3",
        title: "Review database structure",
        project: "Academic System",
        priority: "Medium",
        due: "",
        completed: true,
        },
        {
        id: "sample-4",
        title: "Update project documentation",
        project: "DevTask",
        priority: "Low",
        due: "",
        completed: false,
        },
    ];

    function loadTasks() {
        try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved === null) {
            return sampleTasks.map((task) => ({ ...task }));
        }

        const parsed = JSON.parse(saved);

        if (
            !Array.isArray(parsed) ||
            !parsed.every(
            (task) =>
                task &&
                typeof task.id === "string" &&
                typeof task.title === "string" &&
                typeof task.project === "string" &&
                ["Low", "Medium", "High"].includes(task.priority) &&
                typeof task.completed === "boolean"
            )
        ) {
            throw new Error("Invalid saved task data");
        }

        return parsed;
        } catch (error) {
        console.error("Could not load DevTask data:", error);
        return sampleTasks.map((task) => ({ ...task }));
        }
    }

    let tasks = loadTasks();

    function saveTasks() {
        try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
        } catch (error) {
        console.error("Could not save DevTask data:", error);
        alert("Task tidak bisa disimpan di browser. Periksa ruang penyimpanan.");
        return false;
        }
    }

    function formatDate(dateString) {
        if (!dateString) return "No date";

        const date = new Date(`${dateString}T00:00:00`);

        if (Number.isNaN(date.getTime())) return "No date";

        return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        }).format(date);
    }

    function isOverdue(task) {
        if (!task.due || task.completed) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueDate = new Date(`${task.due}T00:00:00`);

        return !Number.isNaN(dueDate.getTime()) && dueDate < today;
    }

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;

        return element;
    }

    function renderTasks() {
        taskList.replaceChildren();

        const searchInput = document.getElementById("task-search");
        const statusFilter = document.getElementById("task-status-filter");
        const priorityFilter = document.getElementById("task-priority-filter");

        const searchQuery = (searchInput?.value || "").trim().toLowerCase();
        const selectedStatus = statusFilter?.value || "all";
        const selectedPriority = priorityFilter?.value || "all";

        const filteredTasks = tasks.filter((task) => {
            const matchesSearch =
                (task.title || "").toLowerCase().includes(searchQuery) ||
                (task.project || "").toLowerCase().includes(searchQuery);

            const matchesStatus =
                selectedStatus === "all" ||
                (selectedStatus === "completed" && task.completed) ||
                (selectedStatus === "in-progress" && !task.completed);

            const matchesPriority =
                selectedPriority === "all" ||
                (task.priority || "").toLowerCase() === selectedPriority;

            return matchesSearch && matchesStatus && matchesPriority;
        });

        if (filteredTasks.length === 0) {
            taskList.append(
                createElement(
                    "p",
                    "task-empty",
                    tasks.length === 0
                        ? "No tasks yet. Create your first task!"
                        : "No matching tasks found."
                )
            );
        }

        filteredTasks.forEach((task) => {
        const row = createElement(
            "div",
            `task-row${task.completed ? " is-completed" : ""}`
        );

        const main = createElement("div", "task-main");
        const checkbox = createElement("input", "task-checkbox");

        checkbox.type = "checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", `Complete ${task.title}`);

        checkbox.addEventListener("change", () => {
            const previous = task.completed;
            task.completed = checkbox.checked;

            if (!saveTasks()) {
            task.completed = previous;
            }

            renderTasks();
            updateStats();
        });

        const details = createElement("div", "task-details");
        details.append(
            createElement("span", "task-title", task.title),
            createElement("span", "task-project", task.project)
        );

        main.append(checkbox, details);

        const priority = createElement(
            "span",
            `task-priority ${task.priority.toLowerCase()}`,
            task.priority
        );

        const due = createElement(
            "span",
            `task-due${isOverdue(task) ? " overdue" : ""}`,
            isOverdue(task) ? "Overdue" : formatDate(task.dueDate)
        );

        const deleteButton = createElement("button", "delete-task", "×");
        deleteButton.type = "button";
        deleteButton.setAttribute("aria-label", `Delete ${task.title}`);

        deleteButton.addEventListener("click", () => {
            const confirmed = window.confirm(
                `r u sure u want to delete?"${task.title}"?`
            );

            if (!confirmed) return;

            tasks = tasks.filter((item) => item.id !== task.id);

            saveTasks();
            renderTasks();
            updateStats();
        });

        const editButton = document.createElement("button");

        editButton.type = "button";
        editButton.className = "edit-task";
        editButton.textContent = "Edit";
        editButton.setAttribute("aria-label", `Edit task ${task.title}`);

        editButton.addEventListener("click", () => {
            const title = window.prompt("Task name:", task.title);
            if (title === null) return;

            if (!title.trim()) {
                window.alert("Task name cannot be empty.");
                return;
            }

            const project = window.prompt("Project name:", task.project);
            if (project === null) return;

            const priority = window.prompt(
                "Priority: High, Medium, or Low",
                task.priority
            );

            if (priority === null) return;

            const normalizedPriority = priority.trim().toLowerCase();
            const priorityMap = {
                high: "High",
                medium: "Medium",
                low: "Low",
            };

            if (!priorityMap[normalizedPriority]) {
                window.alert("Priority must be High, Medium, or Low.");
                return;
            }

            const dueDate = window.prompt(
                "Due date (YYYY-MM-DD), leave empty if none:",
                task.dueDate || ""
            );

            if (dueDate === null) return;

            if (
                dueDate.trim() &&
                !/^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim())
            ) {
                window.alert("Please use the YYYY-MM-DD date format.");
                return;
            }

            task.title = title.trim();
            task.project = project.trim();
            task.priority = priorityMap[normalizedPriority];
            task.dueDate = dueDate.trim();

            saveTasks();
            renderTasks();
            updateStats();
        });

        row.append(
            main,
            priority,
            due,
            editButton,
            deleteButton
        );

        taskList.append(row);
        });

        taskCount.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;
        taskSummary.textContent = `${tasks.filter((task) => task.completed).length} of ${tasks.length} tasks completed`;
    }

    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter((task) => task.completed).length;
        const overdue = tasks.filter(isOverdue).length;

        if (stats.total) stats.total.textContent = total;
        if (stats.completed) stats.completed.textContent = completed;
        if (stats.inProgress) stats.inProgress.textContent = total - completed;
        if (stats.overdue) stats.overdue.textContent = overdue;
    }

    function openModal() {
        modal.hidden = false;
        titleInput.focus();
    }

    function closeModal() {
        modal.hidden = true;
        form.reset();
        openButton.focus();
    }

    openButton.addEventListener("click", openModal);
    closeButton.addEventListener("click", closeModal);
    cancelButton.addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.hidden) {
        closeModal();
        }
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const title = String(formData.get("title") || "").trim();
        const project = String(formData.get("project") || "").trim();
        const priority = String(formData.get("priority") || "Medium");
        const due = String(formData.get("due") || "");

        if (!title || !project) return;

        if (!["Low", "Medium", "High"].includes(priority)) return;

        const newTask = {
        id: crypto.randomUUID(),
        title,
        project,
        priority,
        due,
        completed: false,
        };

        tasks = [newTask, ...tasks];

        if (!saveTasks()) {
        tasks = tasks.filter((task) => task.id !== newTask.id);
        return;
        }

        renderTasks();
        updateStats();
        closeModal();
    });

    renderTasks();
    updateStats();
});