import { supabase } from "../lib/supabase.js";

    type Task = {
        id: string;
        title: string;
        project: string;
        projectId: string | null;
        priority: "Low" | "Medium" | "High";
        dueDate: string;
        completed: boolean;
    };

    type Project = {
        id: string;
        name: string;
    };

    document.addEventListener("DOMContentLoaded", async () => {
    const taskList = document.querySelector<HTMLElement>("#task-list");
    const taskCount = document.querySelector<HTMLElement>("#task-count");
    const taskSummary = document.querySelector<HTMLElement>("#task-summary");

    const modal = document.querySelector<HTMLElement>("#task-modal");
    const openButton = document.querySelector<HTMLButtonElement>("#create-task-button");
    const closeButton = document.querySelector<HTMLButtonElement>("#close-task-modal");
    const cancelButton = document.querySelector<HTMLButtonElement>("#cancel-task-modal");
    const form = document.querySelector<HTMLFormElement>("#task-form");
    const titleInput = document.querySelector<HTMLInputElement>("#task-title-input");
    const projectInput =
        form?.querySelector<HTMLSelectElement>('[name="project"]');

    const formPriorityInput =
        form?.querySelector<HTMLSelectElement>('[name="priority"]');

    const dueInput =
        form?.querySelector<HTMLInputElement>('[name="due"]');

    const submitButton = form?.querySelector<HTMLButtonElement>(
        'button[type="submit"]'
    );

    const modalHeading = modal?.querySelector<HTMLElement>(
        "h1, h2, h3, .modal-title, [data-modal-title]"
    );

    const originalModalHeading = modalHeading?.textContent ?? "Create a task";
    const originalSubmitLabel = submitButton?.textContent ?? "Create Task";

    const searchInput = document.querySelector<HTMLInputElement>("#task-search");
    const statusFilter = document.querySelector<HTMLSelectElement>("#task-status-filter");
    const priorityFilter = document.querySelector<HTMLSelectElement>("#task-priority-filter");

    const stats = {
        total: document.querySelector<HTMLElement>('[data-stat="total"]'),
        completed: document.querySelector<HTMLElement>('[data-stat="completed"]'),
        inProgress: document.querySelector<HTMLElement>('[data-stat="in-progress"]'),
        overdue: document.querySelector<HTMLElement>('[data-stat="overdue"]'),
    };

    if (!taskList || !modal || !openButton || !closeButton || !cancelButton || !form || !titleInput) {
        console.error("DevTask dashboard elements are missing. Check index.astro element IDs.");
        return;
    }

    let tasks: Task[] = [];
    let projects: Project[] = [];
    let editingTaskId: string | null = null;

    async function loadProjects() {
        const { data, error } = await supabase
            .from("projects")
            .select("id, name")
            .order("name", { ascending: true });

        if (error) {
            showError(`Could not load projects: ${error.message}`);
            return false;
        }

        projects = (data ?? []) as Project[];

        if (projectInput) {
            projectInput.replaceChildren();

            const noProjectOption = document.createElement("option");
            noProjectOption.value = "";
            noProjectOption.textContent = "Tanpa proyek";
            projectInput.append(noProjectOption);

            projects.forEach((project) => {
                const option = document.createElement("option");
                option.value = project.id;
                option.textContent = project.name;
                projectInput.append(option);
            });
        }

        return true;
    }

    function showError(message: string) {
        console.error("DevTask:", message);
        window.alert(message);
    }

    function formatDate(dateString: string) {
        if (!dateString) return "No date";

        const date = new Date(`${dateString}T00:00:00`);
        if (Number.isNaN(date.getTime())) return "No date";

        return new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        }).format(date);
    }

    function isOverdue(task: Task) {
        if (!task.dueDate || task.completed) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueDate = new Date(`${task.dueDate}T00:00:00`);
        return !Number.isNaN(dueDate.getTime()) && dueDate < today;
    }

    function createElement<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        className?: string,
        text?: string,
    ): HTMLElementTagNameMap[K] {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter((task) => task.completed).length;
        const overdue = tasks.filter(isOverdue).length;

        if (stats.total) stats.total.textContent = String(total);
        if (stats.completed) stats.completed.textContent = String(completed);
        if (stats.inProgress) stats.inProgress.textContent = String(total - completed);
        if (stats.overdue) stats.overdue.textContent = String(overdue);
    }

    function renderTasks() {
        taskList.replaceChildren();

        const searchQuery = (searchInput?.value || "").trim().toLowerCase();
        const selectedStatus = statusFilter?.value || "all";
        const selectedPriority = priorityFilter?.value || "all";

        const filteredTasks = tasks.filter((task) => {
        const matchesSearch =
            task.title.toLowerCase().includes(searchQuery) ||
            task.project.toLowerCase().includes(searchQuery);

        const matchesStatus =
            selectedStatus === "all" ||
            (selectedStatus === "completed" && task.completed) ||
            (selectedStatus === "in-progress" && !task.completed);

        const matchesPriority =
            selectedPriority === "all" ||
            task.priority.toLowerCase() === selectedPriority;

        return matchesSearch && matchesStatus && matchesPriority;
        });

        if (filteredTasks.length === 0) {
        taskList.append(
            createElement(
            "p",
            "task-empty",
            tasks.length === 0
                ? "No tasks yet. Create your first task!"
                : "No matching tasks found.",
            ),
        );
        }

        filteredTasks.forEach((task) => {
        const row = createElement(
            "div",
            `task-row${task.completed ? " is-completed" : ""}`,
        );

        const main = createElement("div", "task-main");
        const checkbox = createElement("input", "task-checkbox");
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", `Complete ${task.title}`);

        checkbox.addEventListener("change", async () => {
            const nextCompleted = checkbox.checked;
            checkbox.disabled = true;

            const { error } = await supabase
            .from("tasks")
            .update({ completed: nextCompleted })
            .eq("id", task.id);

            checkbox.disabled = false;

            if (error) {
            checkbox.checked = task.completed;
            showError(`Could not update task: ${error.message}`);
            return;
            }

            task.completed = nextCompleted;
            renderTasks();
            updateStats();
        });

        const details = createElement("div", "task-details");
        details.append(
            createElement("span", "task-title", task.title),
            createElement("span", "task-project", task.project),
        );
        main.append(checkbox, details);

        const priority = createElement(
            "span",
            `task-priority ${task.priority.toLowerCase()}`,
            task.priority,
        );

        const overdue = isOverdue(task);
        const due = createElement(
            "span",
            `task-due${overdue ? " overdue" : ""}`,
            overdue ? "Overdue" : formatDate(task.dueDate),
        );

        const editButton = createElement("button", "edit-task", "Edit");
        editButton.type = "button";
        editButton.setAttribute("aria-label", `Edit task ${task.title}`);

        editButton.addEventListener("click", () => {
            editingTaskId = task.id;

            titleInput.value = task.title;

            if (projectInput) {
                projectInput.value = task.projectId ?? "";
            }

            if (formPriorityInput) {
                formPriorityInput.value = task.priority;
            }

            if (dueInput) {
                dueInput.value = task.dueDate;
            }

            if (modalHeading) {
                modalHeading.textContent = "Edit task";
            }

            if (submitButton) {
                submitButton.textContent = "Save Changes";
            }

            modal.hidden = false;
            titleInput.focus();
        });

        const deleteButton = createElement("button", "delete-task", "×");
        deleteButton.type = "button";
        deleteButton.setAttribute("aria-label", `Delete ${task.title}`);

        deleteButton.addEventListener("click", async () => {
            if (!(await confirmDeleteTask(task.title))) {
                return;
            }

            deleteButton.disabled = true;

            const { error } = await supabase
            .from("tasks")
            .delete()
            .eq("id", task.id);

            if (error) {
            deleteButton.disabled = false;
            showError(`Could not delete task: ${error.message}`);
            return;
            }

            tasks = tasks.filter((item) => item.id !== task.id);
            renderTasks();
            updateStats();
        });

        row.append(main, priority, due, editButton, deleteButton);
        taskList.append(row);
        });

        if (taskCount) {
        taskCount.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;
        }

        if (taskSummary) {
        const completed = tasks.filter((task) => task.completed).length;
        taskSummary.textContent = `${completed} of ${tasks.length} tasks completed`;
        }
    }

    function confirmDeleteTask(taskTitle: string): Promise<boolean> {
        return new Promise((resolve) => {
            const overlay = document.createElement("div");
            overlay.className = "delete-modal-overlay";

            const modal = document.createElement("div");
            modal.className = "delete-modal";
            modal.setAttribute("role", "alertdialog");
            modal.setAttribute("aria-modal", "true");
            modal.setAttribute("aria-labelledby", "delete-modal-title");
            modal.setAttribute("aria-describedby", "delete-modal-description");

            const icon = document.createElement("div");
            icon.className = "delete-modal-icon";
            icon.textContent = "!";

            const heading = document.createElement("h2");
            heading.id = "delete-modal-title";
            heading.textContent = "Delete this task?";

            const description = document.createElement("p");
            description.id = "delete-modal-description";
            description.textContent =
                `You're about to delete "${taskTitle}". This action cannot be undone.`;

            const actions = document.createElement("div");
            actions.className = "delete-modal-actions";

            const cancelButton = document.createElement("button");
            cancelButton.type = "button";
            cancelButton.className = "delete-modal-cancel";
            cancelButton.textContent = "Cancel";

            const confirmButton = document.createElement("button");
            confirmButton.type = "button";
            confirmButton.className = "delete-modal-confirm";
            confirmButton.textContent = "Delete Task";

            actions.append(cancelButton, confirmButton);
            modal.append(icon, heading, description, actions);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            let finished = false;

            function closeModal(result: boolean) {
                if (finished) return;
                finished = true;

                document.removeEventListener("keydown", handleKeydown);
                overlay.remove();
                resolve(result);
            }

            function handleKeydown(event: KeyboardEvent) {
                if (event.key === "Escape") {
                    closeModal(false);
                }
            }

            cancelButton.addEventListener("click", () => closeModal(false));
            confirmButton.addEventListener("click", () => closeModal(true));

            overlay.addEventListener("click", (event) => {
                if (event.target === overlay) {
                    closeModal(false);
                }
            });

            document.addEventListener("keydown", handleKeydown);

            cancelButton.focus();
        });
    }

    function openModal() {
        modal.hidden = false;
        titleInput.focus();
    }

    function closeModal() {
        modal.hidden = true;
        form.reset();
        editingTaskId = null;

        if (modalHeading) {
            modalHeading.textContent = originalModalHeading;
        }

        if (submitButton) {
            submitButton.textContent = originalSubmitLabel;
            submitButton.disabled = false;
        }

        openButton.focus();
    }

    searchInput?.addEventListener("input", renderTasks);
    statusFilter?.addEventListener("change", renderTasks);
    priorityFilter?.addEventListener("change", renderTasks);

    openButton.addEventListener("click", openModal);
    closeButton.addEventListener("click", closeModal);
    cancelButton.addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.hidden) closeModal();
    });

    
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const title = String(formData.get("title") || "").trim();
        const projectId = String(formData.get("project") || "").trim();
        const selectedProject =
            projects.find((item) => item.id === projectId) ?? null;
        const project = selectedProject?.name ?? "";
        const priority = String(formData.get("priority") || "Medium");
        const dueDate = String(formData.get("due") || "").trim();

        if (!title) {
            window.alert("Please enter a task name.");
            return;
        }

        if (!["Low", "Medium", "High"].includes(priority)) {
            window.alert("Priority must be Low, Medium, or High.");
            return;
        }

        if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
            window.alert("Please use the YYYY-MM-DD date format.");
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = editingTaskId
            ? "Saving..."
            : "Creating...";
        }

        try {
            if (editingTaskId) {
            const taskId = editingTaskId;

            const { error } = await supabase
                .from("tasks")
                .update({
                    title,
                    project,
                    project_id: selectedProject?.id ?? null,
                    priority,
                    due_date: dueDate || null,
                })
                .eq("id", taskId);

            if (error) {
                showError(`Could not save task changes: ${error.message}`);
                return;
            }

            tasks = tasks.map((task) =>
                task.id === taskId
                ? {
                    ...task,
                    title,
                    project,
                    projectId: selectedProject?.id ?? null,
                    priority: priority as Task["priority"],
                    dueDate,
                    }
                : task
            );

            renderTasks();
            updateStats();
            closeModal();
            return;
            }

            const { data, error } = await supabase
            .from("tasks")
            .insert({
                title,
                project,
                project_id: selectedProject?.id ?? null,
                priority,
                due_date: dueDate || null,
                completed: false,
            })
            .select("id, title, project, project_id, priority, due_date, completed")
            .single();

            if (error) {
            showError(`Could not create task: ${error.message}`);
            return;
            }

            const newTask: Task = {
                id: data.id,
                title: data.title,
                project: data.project,
                priority: data.priority,
                dueDate: data.due_date || "",
                completed: data.completed,
                projectId: data.project_id ?? null,
            };

            tasks = [newTask, ...tasks];
            renderTasks();
            updateStats();
            closeModal();
        } catch (error) {
            console.error("DevTask task submission error:", error);
            showError("An unexpected error occurred. Please try again.");
        } finally {
            if (submitButton) {
            submitButton.disabled = false;

            if (!editingTaskId) {
                submitButton.textContent = originalSubmitLabel;
            } else {
                submitButton.textContent = "Save Changes";
            }
            }
        }
    });

    // Verify authentication before displaying the dashboard.
    const dashboard = document.querySelector<HTMLElement>("#dashboard-content");

    if (dashboard) {
        dashboard.hidden = true;
    }

    const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
        window.location.replace("/login");
        return;
    }

    if (dashboard) {
        dashboard.hidden = false;
    }

    const projectsLoaded = await loadProjects();

    if (!projectsLoaded) {
        return;
    }

    const { data, error } = await supabase
        .from("tasks")
        .select("id, title, project, project_id, priority, due_date, completed")
        .order("created_at", { ascending: false });

    if (error) {
        showError(`Could not load your tasks: ${error.message}`);
        return;
    }

    tasks = (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        project: row.project,
        priority: row.priority,
        dueDate: row.due_date || "",
        completed: row.completed,
        projectId: row.project_id ?? null,
    }));

    renderTasks();
    updateStats();

    // Keep the dashboard protected when authentication changes.
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT" || !session) {
            window.location.replace("/login");
        }
    });
});