/* Проверка итогового теста. Правильные ответы хранятся в data-answer каждого задания. */
(function () {
  "use strict";

  var SCALE = [
    { min: 85, grade: "отлично" },
    { min: 70, grade: "хорошо" },
    { min: 55, grade: "удовлетворительно" },
    { min: 0, grade: "неудовлетворительно" }
  ];

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("test-form");
    var resultBox = document.getElementById("test-result");
    var progress = document.getElementById("test-progress");
    if (!form) return;
    var questions = Array.prototype.slice.call(form.querySelectorAll(".tq"));
    var total = questions.length;

    function selected(q) {
      return Array.prototype.slice.call(q.querySelectorAll("input:checked")).map(function (i) { return i.value; });
    }

    function updateProgress() {
      var answered = questions.filter(function (q) { return selected(q).length > 0; }).length;
      progress.textContent = "Отвечено: " + answered + " из " + total;
    }

    function clearMarks() {
      questions.forEach(function (q) {
        q.removeAttribute("data-state");
        q.querySelectorAll("label").forEach(function (l) { l.classList.remove("is-right", "is-wrong", "is-missed"); });
        var v = q.querySelector(".verdict");
        if (v) v.remove();
        var e = q.querySelector(".explain");
        if (e) e.hidden = true;
      });
    }

    form.addEventListener("change", function () {
      if (form.classList.contains("is-checked")) { form.classList.remove("is-checked"); clearMarks(); resultBox.hidden = true; }
      updateProgress();
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      clearMarks();
      var score = 0, unanswered = 0;

      questions.forEach(function (q) {
        var right = q.getAttribute("data-answer").split(",");
        var chosen = selected(q);
        if (chosen.length === 0) unanswered++;
        var ok = chosen.length === right.length && right.every(function (r) { return chosen.indexOf(r) !== -1; });
        if (ok) score++;

        q.querySelectorAll("label").forEach(function (l) {
          var input = l.querySelector("input");
          var isRight = right.indexOf(input.value) !== -1;
          if (input.checked && isRight) l.classList.add("is-right");
          else if (input.checked && !isRight) l.classList.add("is-wrong");
          else if (!input.checked && isRight) l.classList.add("is-missed");
        });

        q.setAttribute("data-state", ok ? "ok" : "bad");
        var verdict = document.createElement("p");
        verdict.className = "verdict " + (ok ? "ok" : "bad");
        verdict.textContent = ok ? "Верно, 1 балл" : (chosen.length ? "Неверно, 0 баллов. Пунктиром отмечены пропущенные верные варианты." : "Нет ответа, 0 баллов");
        var explain = q.querySelector(".explain");
        q.insertBefore(verdict, explain);
        if (explain && !ok) explain.hidden = false;
      });

      var pct = Math.round(score / total * 1000) / 10;
      var grade = SCALE.filter(function (s) { return pct >= s.min; })[0].grade;
      resultBox.innerHTML =
        '<div class="score">' + score + " из " + total + "</div>" +
        '<p class="grade">' + String(pct).replace(".", ",") + " % верных ответов — оценка «" + grade + "»</p>" +
        "<p>" + (score === total ? "Все задания решены верно." :
          (total - score) + " " + plural(total - score, "задание не засчитано", "задания не засчитаны", "заданий не засчитано") +
          (unanswered ? ", из них без ответа — " + unanswered : "") +
          ". Ошибки отмечены красным, пропущенные верные варианты — зелёным пунктиром, под каждым незасчитанным заданием есть пояснение.") + "</p>";
      resultBox.hidden = false;
      form.classList.add("is-checked");
      resultBox.focus({ preventScroll: true });
      resultBox.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    });

    form.addEventListener("reset", function () {
      clearMarks();
      form.classList.remove("is-checked");
      resultBox.hidden = true;
      setTimeout(updateProgress, 0);
      window.scrollTo(0, form.offsetTop - 80);
    });

    updateProgress();
  });
})();
