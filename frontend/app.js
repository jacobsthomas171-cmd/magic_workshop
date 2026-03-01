const API = 'http://127.0.0.1:8002';

// ----------------------------
// Session Helpers
// ----------------------------
function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem('user'));
  } catch {
    return null;
  }
}

function setUser(u) {
  sessionStorage.setItem('user', JSON.stringify({ id: u.id, name: u.name }));
}

function clearUser() {
  sessionStorage.removeItem('user');
}

function formatDate(iso) {
  try {
    return iso
      ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'short' })
      : '';
  } catch {
    return iso;
  }
}

// ----------------------------
// API Helper
// ----------------------------
async function api(method, path, body) {
  const options = { method, headers: {} };

  if (body != null) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const res = await fetch(API + path, options);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : Array.isArray(data?.detail)
        ? data.detail.map((x) => x.msg).join(' ')
        : data?.detail || res.statusText;

    throw new Error(message);
  }

  return data;
}

// ----------------------------
// SIGNUP
// ----------------------------
if (document.getElementById('signup-form')) {
  document.getElementById('signup-form').onsubmit = async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!name || !email || !password) return;

    try {
      const user = await api('POST', '/users', { name, email, password });
      setUser(user);
      location.href = 'todos.html';
    } catch (err) {
      alert(err.message);
    }
  };
}

// ----------------------------
// LOGIN (Simple email match)
// ----------------------------
if (document.getElementById('login-form')) {
  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    if (!email) return;

    try {
      const users = await api('GET', '/users');
      const user = users.find(
        (u) => (u.email || '').toLowerCase() === email.toLowerCase()
      );

      if (!user) {
        alert('User not found');
        return;
      }

      setUser(user);
      location.href = 'todos.html';
    } catch (err) {
      alert(err.message);
    }
  };
}

// ----------------------------
// TODOS PAGE
// ----------------------------
if (document.getElementById('todo-form')) {
  const user = getUser();

  if (!user) {
    location.href = 'login.html';
    throw new Error('Not logged in');
  }

  document.getElementById(
    'greeting'
  ).textContent = `Hi, ${user.name}. Your todos:`;

  const list = document.getElementById('list');

  async function loadTodos() {
    try {
      const todos = await api('GET', `/users/${user.id}/todos`);
      list.innerHTML = '';

      (todos || []).forEach((todo) => {
        const li = document.createElement('li');
        li.className = 'list-item';

        const left = document.createElement('div');

        const title = document.createElement('div');
        title.className = 'todo-title';
        title.textContent = todo.title;

        const meta = document.createElement('div');
        meta.className = 'todo-meta';
        meta.textContent = [todo.description, formatDate(todo.created_at)]
          .filter(Boolean)
          .join(' · ');

        left.append(title, meta);

        // DELETE BUTTON
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'btn btn--secondary';
        deleteBtn.onclick = async () => {
          if (!confirm('Delete this todo?')) return;

          try {
            await api('DELETE', `/todos/${todo.id}`);
            loadTodos();
          } catch (err) {
            alert(err.message);
          }
        };

        li.append(left, deleteBtn);
        list.appendChild(li);
      });
    } catch (err) {
      alert(err.message);
    }
  }

  // CREATE TODO
  document.getElementById('todo-form').onsubmit = async (e) => {
    e.preventDefault();

    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!title) return;

    try {
      const body = {
        user_id: user.id,
        title,
      };

      if (description) body.description = description;

      await api('POST', '/todos', body);

      document.getElementById('title').value = '';
      document.getElementById('description').value = '';

      loadTodos();
    } catch (err) {
      alert(err.message);
    }
  };

  // LOGOUT
  document.getElementById('logout').onclick = () => {
    clearUser();
    location.href = 'login.html';
  };

  // Initial Load
  loadTodos();
}