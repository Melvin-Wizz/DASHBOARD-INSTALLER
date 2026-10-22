(function () {
  "use strict";
  var BASE = "https://infoassisnet.sgp.net.br";
  if (location.origin !== BASE) {
    alert("Abra o SGP da InfoAssis, entre no sistema e clique no favorito SGP Dashboard.");
    return;
  }
  var win = window.open("about:blank", "_blank");
  if (!win) {
    alert("O navegador bloqueou a nova aba. Permita pop-ups para o SGP e tente novamente.");
    return;
  }
  function dashboardRuntime() {
    "use strict";
    var BASE = "https://infoassisnet.sgp.net.br";
    var USERS = [
      { key: "n1", name: "N1", user: "chamados.n1", color: "#27c58a" },
      { key: "matheus", name: "MATHEUS / MELVIN", user: "matheus.clemente", color: "#3d9bff" },
      { key: "maria", name: "MARIA", user: "maria.toni", color: "#f6b94a" },
      { key: "arthur", name: "ARTHUR", user: "arthur.oliveira", color: "#bd79ff" }
    ].map(function (u) {
      u.url = BASE + "/admin/atendimento/dashboard/os/responsavel/resumo/?usuario=" + encodeURIComponent(u.user);
      return u;
    });
    var intervalMs = 60000;
    var busy = false;
    var currentResults = [];
    var lastUpdated = null;
    var lastError = "";
    var app = document.getElementById("app");

    function txt(v) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim(); }
    function norm(v) {
      return txt(v).normalize("NFD").toLowerCase().split("").filter(function (c) {
        var n = c.charCodeAt(0); return (n >= 48 && n <= 57) || (n >= 97 && n <= 122);
      }).join("");
    }
    function esc(v) {
      return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function safeUrl(v, base) {
      try { var u = new URL(v, base); return u.origin === BASE && u.pathname.indexOf("/admin/") === 0 ? u.href : null; }
      catch (e) { return null; }
    }
    function classes(n) {
      var c = n && n.className;
      if (typeof c === "string") return c;
      if (c && typeof c.baseVal === "string") return c.baseVal;
      return n && n.getAttribute ? n.getAttribute("class") || "" : "";
    }
    function candidate(n, base) {
      var attrs = ["href", "data-href", "data-url", "data-edit-url", "formaction"];
      for (var i = 0; i < attrs.length; i++) {
        var v = n.getAttribute && n.getAttribute(attrs[i]);
        if (v && v.trim() && v.trim() !== "#" && v.toLowerCase().indexOf("javascript:") !== 0) {
          var s = safeUrl(v.trim(), base); if (s) return s;
        }
      }
      var code = n.getAttribute && n.getAttribute("onclick") || "";
      var m = code.match(/(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']|(?:window\.)?open\(\s*["']([^"']+)["']/i);
      if (m) return safeUrl(m[1] || m[2], base);
      return null;
    }
    function editUrl(row, base) {
      var els = Array.from(row.querySelectorAll("a[href],button,[role='button'],[onclick],[data-href],[data-url],[data-edit-url],[formaction]"));
      for (var i = 0; i < els.length; i++) {
        var n = els[i];
        var iconText = Array.from(n.querySelectorAll("i,svg,span,img")).map(function (x) {
          return [classes(x), x.getAttribute("title"), x.getAttribute("aria-label"), x.getAttribute("alt")].filter(Boolean).join(" ");
        }).join(" ");
        var label = [n.textContent, n.getAttribute("title"), n.getAttribute("aria-label"), n.getAttribute("data-original-title"), n.getAttribute("data-bs-original-title"), n.getAttribute("data-action"), classes(n), n.getAttribute("onclick"), iconText].filter(Boolean).map(txt).join(" ").toLowerCase();
        var raw = ["href", "data-href", "data-url", "data-edit-url", "formaction"].map(function (a) { return n.getAttribute(a) || ""; }).find(function (v) { return v && v !== "#"; }) || "";
        var looks = ["editar", "edit", "alterar", "fa-pencil", "fa-pen", "pencil", "icon-edit", "btn-edit"].some(function (k) { return label.indexOf(k) >= 0; }) || ["editar", "edit", "alterar", "change", "update"].some(function (k) { return raw.toLowerCase().indexOf(k) >= 0; });
        if (looks) {
          var u = candidate(n, base); if (u) return u;
          var f = n.closest("form[action]"); if (f) { u = safeUrl(f.getAttribute("action"), base); if (u) return u; }
        }
      }
      return null;
    }
    function fieldIndex(headers, field) {
      var h = headers.map(norm), rules = {
        os: [function (v) { return v === "os"; }, function (v) { return ["nros", "numeroos", "numerodaos", "ordemservico", "numeroordemservico"].indexOf(v) >= 0; }],
        cadastro: [function (v) { return v === "cadastro" || v.indexOf("cadastro") >= 0; }, function (v) { return ["cliente", "nomecliente", "assinante", "nomeassinante"].indexOf(v) >= 0; }],
        agendamento: [function (v) { return v.indexOf("agendamento") >= 0 || v === "agenda" || v.indexOf("dataagend") >= 0; }],
        bairro: [function (v) { return v.indexOf("bairro") >= 0; }]
      };
      for (var r of rules[field]) { var idx = h.findIndex(r); if (idx >= 0) return idx; }
      return -1;
    }
    function parseResponse(html, responseUrl) {
      var doc = new DOMParser().parseFromString(html, "text/html"), body = txt(doc.body && doc.body.textContent);
      if ((responseUrl || "").toLowerCase().indexOf("/login") >= 0 || ((/type=["']password["']/i.test(html.slice(0, 15000))) && /senha|login/i.test(body))) {
        throw Error("A resposta parece ser a tela de login. Entre no SGP novamente.");
      }
      if (["sessão expirada", "sessao expirada", "não autorizado", "nao autorizado", "acesso negado", "faça login", "faca login"].some(function (s) { return body.toLowerCase().indexOf(s) >= 0; })) {
        throw Error("O SGP recusou a consulta ou a sessão expirou.");
      }
      if (["nenhum registro", "nenhuma os", "nenhuma ordem", "sem registros", "nada encontrado"].some(function (s) { return body.toLowerCase().indexOf(s) >= 0; })) return { rows: [] };
      var tables = Array.from(doc.querySelectorAll("table")), rows = [], seen = new Set(), dataFound = false, editFound = false;
      tables.forEach(function (table) {
        var trs = Array.from(table.querySelectorAll("tr"));
        var hr = table.querySelector("thead tr") || trs.find(function (r) { return !!r.querySelector("th"); }) || trs.find(function (r) { var t = norm(r.textContent); return t.indexOf("agendamento") >= 0 && t.indexOf("bairro") >= 0 && (t.indexOf("cadastro") >= 0 || t.indexOf("os") >= 0); }) || null;
        var headers = hr ? Array.from(hr.querySelectorAll("th,td")).map(function (c) { return c.textContent || c.innerText || ""; }) : [];
        trs.forEach(function (row) {
          if (row === hr || (row.querySelector("th") && !row.querySelector("td"))) return;
          var cells = Array.from(row.querySelectorAll(":scope > td, :scope > th")); if (!cells.length) return;
          var rowText = txt(row.textContent); if (!rowText) return; dataFound = true;
          var url = editUrl(row, responseUrl || BASE); if (!url) return; editFound = true;
          var vals = cells.map(function (c) { return txt(c.textContent || c.innerText || ""); });
          var ix = { os: fieldIndex(headers, "os"), cadastro: fieldIndex(headers, "cadastro"), agendamento: fieldIndex(headers, "agendamento"), bairro: fieldIndex(headers, "bairro") };
          var f = {};
          Object.keys(ix).forEach(function (k) { f[k] = ix[k] >= 0 ? (vals[ix[k]] || "—") : "—"; });
          cells.forEach(function (c, i) {
            var label = norm(c.getAttribute("data-label") || c.getAttribute("data-title") || c.getAttribute("aria-label") || "");
            if (f.os === "—" && (label === "os" || label.indexOf("numeroos") >= 0)) f.os = vals[i] || "—";
            if (f.cadastro === "—" && (label.indexOf("cadastro") >= 0 || label === "cliente")) f.cadastro = vals[i] || "—";
            if (f.agendamento === "—" && label.indexOf("agendamento") >= 0) f.agendamento = vals[i] || "—";
            if (f.bairro === "—" && label.indexOf("bairro") >= 0) f.bairro = vals[i] || "—";
          });
          if (f.os === "—" && vals.length) f.os = vals[0] || "—";
          if (!seen.has(url)) { seen.add(url); rows.push(Object.assign(f, { editUrl: url })); }
        });
      });
      if (rows.length) return { rows: rows };
      if (dataFound && !editFound) throw Error("Encontrei linhas, mas não identifiquei os links EDITAR nesta tabela.");
      return { rows: [] };
    }
    async function loadUser(u) {
      try {
        var r = await fetch(u.url, { credentials: "same-origin", cache: "no-store", redirect: "follow" });
        if (!r.ok) throw Error("HTTP " + r.status);
        var data = parseResponse(await r.text(), r.url || u.url);
        return Object.assign({}, u, { ok: true, rows: data.rows || [], error: "" });
      } catch (e) { return Object.assign({}, u, { ok: false, rows: [], error: e && e.message || "Falha na consulta" }); }
    }
    function piePath(cx, cy, r, a, b) {
      var x1 = cx + r * Math.cos(a), y1 = cy + r * Math.sin(a), x2 = cx + r * Math.cos(b), y2 = cy + r * Math.sin(b), large = b - a > Math.PI ? 1 : 0;
      return "M " + cx + " " + cy + " L " + x1 + " " + y1 + " A " + r + " " + r + " 0 " + large + " 1 " + x2 + " " + y2 + " Z";
    }
    function draw(results) {
      var total = results.reduce(function (n, u) { return n + (u.ok ? u.rows.length : 0); }, 0), s = [];
      s.push("<section class='overview'><div class='card'><svg class='pie' viewBox='0 0 260 260' aria-label='Gráfico de pizza: passe o mouse sobre uma fatia para ver o responsável e a quantidade'>");
      var cx = 130, cy = 130, rad = 105, cur = -Math.PI / 2;
      if (!total) {
        s.push("<circle cx='130' cy='130' r='100' fill='#314054'/><text x='130' y='126' fill='white' font-size='16' text-anchor='middle'>Sem OS</text><text x='130' y='147' fill='#bac6d6' font-size='11' text-anchor='middle'>ou consulta vazia</text>");
      } else {
        results.forEach(function (u) {
          var n = u.ok ? u.rows.length : 0;
          if (n <= 0) return;
          var a = cur, sweep = Math.PI * 2 * n / total, b = cur + sweep;
          cur = b;
          var shape = n === total
            ? "<circle cx='" + cx + "' cy='" + cy + "' r='" + rad + "' fill='" + u.color + "' stroke='#0c121c' stroke-width='2'/>"
            : "<path d='" + piePath(cx, cy, rad, a, b) + "' fill='" + u.color + "' stroke='#0c121c' stroke-width='2'/>";
          var mid = a + sweep / 2;
          var small = sweep < 0.28;
          var labelRadius = small ? rad * 0.78 : rad * 0.62;
          var lx = (cx + labelRadius * Math.cos(mid)).toFixed(1);
          var ly = (cy + labelRadius * Math.sin(mid)).toFixed(1);
          var fontSize = sweep < 0.14 ? 9 : (sweep < 0.28 ? 10 : 14);
          var label = u.name + " — " + n + " OS";
          s.push("<a class='slice' href='#details-" + u.key + "' aria-label='" + esc(label) + "'><title>" + esc(label) + "</title>" + shape + "<text class='slice-count' x='" + lx + "' y='" + ly + "' font-size='" + fontSize + "'>" + n + "</text></a>");
        });
      }
      s.push("</svg><div class='pie-hint'>Passe o mouse sobre uma fatia para ver o nome e a quantidade. Clique para abrir a lista.</div></div><div class='legend'>");
      results.forEach(function (u) {
        s.push("<a href='#details-" + u.key + "' class='item'><span class='swatch' style='background:" + u.color + "'></span><span>" + esc(u.name) + "</span><span class='num'>" + (u.ok ? u.rows.length : "—") + "</span></a>");
      });
      s.push("</div></section>");
      results.forEach(function (u) {
        s.push("<section class='detail' id='details-" + u.key + "'><a class='back' href='#home'>← Voltar ao gráfico</a><div class='card'><div class='top'><div><h2>" + esc(u.name) + "</h2><div class='muted'>OS, cadastro, agendamento e bairro</div></div><span class='pill'>" + (u.ok ? u.rows.length + " OS" : "Falha na consulta") + "</span></div>");
        if (!u.ok) s.push("<p class='error'>" + esc(u.error) + "</p><p><a href='" + esc(u.url) + "' target='_blank' rel='noopener'>Abrir consulta original no SGP ↗</a></p>");
        else if (!u.rows.length) s.push("<p class='muted'>Zerado — nenhuma OS encontrada.</p><p><a href='" + esc(u.url) + "' target='_blank' rel='noopener'>Abrir consulta original no SGP ↗</a></p>");
        else {
          s.push("<div class='tablebox'><table><thead><tr><th>OS</th><th>CADASTRO</th><th>AGENDAMENTO</th><th>BAIRRO</th></tr></thead><tbody>");
          u.rows.forEach(function (r) { s.push("<tr><td><a href='" + esc(r.editUrl) + "' target='_blank' rel='noopener'>" + esc(r.os) + " ↗</a></td><td><a href='" + esc(r.editUrl) + "' target='_blank' rel='noopener'>" + esc(r.cadastro) + "</a></td><td><a href='" + esc(r.editUrl) + "' target='_blank' rel='noopener'>" + esc(r.agendamento) + "</a></td><td><a href='" + esc(r.editUrl) + "' target='_blank' rel='noopener'>" + esc(r.bairro) + "</a></td></tr>"); });
          s.push("</tbody></table></div>");
        }
        s.push("</div></section>");
      });
      document.getElementById("content").innerHTML = s.join("");
      document.getElementById("total").textContent = total + " OS";
    }
    function setStatus(text, isError) {
      var st = document.getElementById("status"); if (!st) return;
      st.textContent = text; st.className = isError ? "status error" : "status muted";
    }
    async function refresh() {
      if (busy) return;
      busy = true;
      var btn = document.getElementById("refresh"); if (btn) { btn.disabled = true; btn.textContent = "Atualizando…"; }
      setStatus("Buscando dados atuais do SGP…", false);
      var results = await Promise.all(USERS.map(loadUser));
      currentResults = results;
      lastUpdated = new Date();
      var errors = results.filter(function (u) { return !u.ok; });
      draw(currentResults);
      var time = lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setStatus("Atualizado às " + time + (errors.length ? " · " + errors.length + " consulta(s) com erro" : "") + " · atualização automática a cada 60 s", errors.length > 0);
      busy = false;
      btn = document.getElementById("refresh"); if (btn) { btn.disabled = false; btn.textContent = "↻ Atualizar agora"; }
    }
    app.innerHTML = "<div class='wrap'><header class='top'><div><div class='muted'>INFOASSIS · SGP</div><h1>OS por responsável</h1><div class='muted'>Atualização automática habilitada</div></div><div class='actions'><span class='pill' id='total'>Carregando…</span><button id='refresh' type='button'>↻ Atualizar agora</button></div></header><div id='status' class='status muted'>Iniciando consulta…</div><div id='content'></div><footer class='muted'>Esta aba consulta somente as quatro URLs configuradas. Os dados permanecem nesta página e não são enviados a serviços externos.</footer></div>";
    app.insertAdjacentHTML("beforeend", "<style>*{box-sizing:border-box}body{margin:0;background:#0c121c;color:#eaf1fa;font:14px system-ui,Arial,sans-serif}.wrap{max-width:1120px;margin:auto;padding:24px}.top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}h1{font-size:26px;margin:3px 0 8px}.muted{color:#97a5b9}.status{margin:16px 0;min-height:20px}.error{color:#ffaeae}.actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.pill{font-size:12px;border:1px solid #314054;padding:7px 10px;border-radius:30px;color:#97a5b9}button{border:0;border-radius:10px;background:#27c58a;color:#062417;padding:11px 14px;font-weight:750;cursor:pointer}button:disabled{opacity:.6;cursor:wait}.overview{display:grid;grid-template-columns:minmax(230px,320px) 1fr;gap:24px;align-items:center;margin:18px 0}.card{background:#161f2d;border:1px solid #314054;border-radius:16px;padding:16px}.pie{width:100%;max-width:310px;display:block;margin:auto}.slice{cursor:pointer;outline:none}.slice:hover{filter:brightness(1.18)}.slice-count{pointer-events:none;fill:#fff;text-anchor:middle;dominant-baseline:middle;font-weight:900;stroke:#0c121c;stroke-width:3px;paint-order:stroke;stroke-linejoin:round}.pie-hint{text-align:center;color:#97a5b9;font-size:11px;margin-top:5px}.legend{display:grid;gap:8px}.legend a{color:inherit;text-decoration:none}.item{display:flex;align-items:center;gap:11px;padding:12px;border:1px solid #314054;border-radius:12px;background:#121a27}.swatch{width:13px;height:13px;border-radius:4px;flex-shrink:0}.num{margin-left:auto;font-size:20px;font-weight:750;font-variant-numeric:tabular-nums}.detail{display:none}.detail:target{display:block}body:has(.detail:target) .overview{display:none}.back{display:inline-block;margin-bottom:14px;color:#95c6ff;text-decoration:none}.detail h2{margin:0 0 6px}.tablebox{overflow:auto;margin-top:16px}table{border-collapse:collapse;width:100%;min-width:620px}th,td{text-align:left;padding:12px;border-bottom:1px solid #314054}th{font-size:11px;letter-spacing:.07em;color:#97a5b9}td a{color:#95c6ff;text-decoration:none;display:block}td a:hover{text-decoration:underline}footer{padding:24px 0 8px;font-size:12px}@media(max-width:680px){.wrap{padding:13px}.overview{grid-template-columns:1fr}.pie{max-width:260px}}</style>");
    app.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("#refresh")) refresh(); });
    refresh();
    window.setInterval(refresh, intervalMs);
  }
  var page = "<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>SGP — OS Compactas</title></head><body><div id='app'>Abrindo painel…</div><script>(" + dashboardRuntime.toString() + ")();</script></body></html>";
  win.document.open();
  win.document.write(page);
  win.document.close();
  win.focus();
})();
