(function () {
  var STORAGE_PREFIX = "tsukiyomi_wonderland_";
  var SHEET_WEBHOOK_STORAGE_KEY = STORAGE_PREFIX + "sheet_webhook_url";
  var SHEET_SECRET_STORAGE_KEY = STORAGE_PREFIX + "sheet_secret_key";
  var SHEET_PROFILE_STORAGE_KEY = STORAGE_PREFIX + "sheet_profile";
  var DEEP_REPORT_SHARED_OVERRIDES_KEY = STORAGE_PREFIX + "deep_report_overrides_v1";

  function getParams() {
    return new URLSearchParams(window.location.search);
  }

  function keepQuery(link) {
    var params = window.location.search;
    if (!params || !link || !link.getAttribute("href")) return;
    var href = link.getAttribute("href");
    if (href.indexOf("http") === 0 || href.indexOf("#") === 0) return;
    link.setAttribute("href", href + params);
  }

  function zodiacFromBirth(birth) {
    if (!birth || birth.length < 10) return "";
    var month = Number(birth.slice(5, 7));
    var day = Number(birth.slice(8, 10));
    if (!month || !day) return "";
    var md = month * 100 + day;
    if (md >= 321 && md <= 419) return "牡羊座";
    if (md >= 420 && md <= 520) return "牡牛座";
    if (md >= 521 && md <= 621) return "双子座";
    if (md >= 622 && md <= 722) return "蟹座";
    if (md >= 723 && md <= 822) return "獅子座";
    if (md >= 823 && md <= 922) return "乙女座";
    if (md >= 923 && md <= 1023) return "天秤座";
    if (md >= 1024 && md <= 1122) return "蠍座";
    if (md >= 1123 && md <= 1221) return "射手座";
    if (md >= 1222 || md <= 119) return "山羊座";
    if (md >= 120 && md <= 218) return "水瓶座";
    if (md >= 219 && md <= 320) return "魚座";
    return "";
  }

  function personalizeGate() {
    var params = getParams();
    var name = params.get("name");
    var target = document.querySelector("[data-gate-name]");
    if (!target || !name) return;
    target.textContent = name + "さんの新月にひらく 自分発見ムーンゲート";
  }

  function readIntroWish(identity) {
    if (!identity) return "";
    try {
      var raw = localStorage.getItem("tsukiyomi:introReflection:v1:" + identity) || "";
      if (!raw) return "";
      var saved = JSON.parse(raw);
      return String((saved && (saved.text || saved.wish)) || "").trim();
    } catch (e) {
      return "";
    }
  }

  function storageKey(day) {
    return STORAGE_PREFIX + "day_" + day;
  }

  function getSheetWebhookUrl() {
    return (localStorage.getItem(SHEET_WEBHOOK_STORAGE_KEY) || "").trim();
  }

  function setSheetWebhookUrl(url) {
    localStorage.setItem(SHEET_WEBHOOK_STORAGE_KEY, (url || "").trim());
  }

  function getSheetSecretKey() {
    return (localStorage.getItem(SHEET_SECRET_STORAGE_KEY) || "").trim();
  }

  function setSheetSecretKey(secret) {
    localStorage.setItem(SHEET_SECRET_STORAGE_KEY, (secret || "").trim());
  }

  function getSheetProfile() {
    try {
      return JSON.parse(localStorage.getItem(SHEET_PROFILE_STORAGE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function setSheetProfile(profile) {
    localStorage.setItem(SHEET_PROFILE_STORAGE_KEY, JSON.stringify(profile || {}));
  }

  function loadSharedDeepReportOverrides() {
    try {
      return JSON.parse(localStorage.getItem(DEEP_REPORT_SHARED_OVERRIDES_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function getDeepReportOverride(pid) {
    if (!pid) return null;
    if (window.DEEP_REPORT_OVERRIDES && window.DEEP_REPORT_OVERRIDES[pid] && window.DEEP_REPORT_OVERRIDES[pid].done) {
      return window.DEEP_REPORT_OVERRIDES[pid];
    }
    var shared = loadSharedDeepReportOverrides();
    if (shared && shared[pid] && shared[pid].done) return shared[pid];
    return null;
  }

  function collectProfileFromParams() {
    var params = getParams();
    var day2SnapshotKey = STORAGE_PREFIX + "item_oracle_snapshot_day2";
    var savedProfile = getSheetProfile();
    var name = params.get("name") || "";
    var birth = params.get("birth") || "";
    var email = params.get("email") || "";
    var participantId = params.get("participantId") || "";
    var concern = params.get("concern") || "";
    var q = params.get("q") || "";
    var q2 = params.get("q2") || "";
    var zodiac = (params.get("zodiac") || "").replace(/\s/g, "");
    var shuku = (params.get("shuku") || params.get("honmei") || params.get("honmeiShuku") || "").replace(/\s/g, "");
    if (!zodiac && birth) zodiac = zodiacFromBirth(birth);
    try {
      var snap = JSON.parse(localStorage.getItem(day2SnapshotKey) || "{}");
      if (!zodiac) zodiac = (snap.zodiac || "").replace(/\s/g, "");
      if (!shuku) shuku = (snap.shuku || "").replace(/\s/g, "");
    } catch (e) {}
    if (!name) name = (savedProfile.name || "");
    if (!birth) birth = (savedProfile.birth || "");
    if (!email) email = (savedProfile.email || "");
    if (!participantId) participantId = (savedProfile.participantId || "");
    if (!concern) concern = (savedProfile.concern || "");
    if (!q) q = (savedProfile.q || "");
    if (!q2) q2 = (savedProfile.q2 || "");
    if (!zodiac) zodiac = (savedProfile.zodiac || "");
    if (!shuku) shuku = (savedProfile.shuku || "");
    return {
      name: name || "未入力",
      email: email || "",
      participantId: participantId || "",
      birth: birth || "",
      zodiac: zodiac || "",
      shuku: shuku || "",
      concern: concern || "",
      q: q || "",
      q2: q2 || ""
    };
  }

  function syncToSheet(recordType, payload) {
    var webhookUrl = getSheetWebhookUrl();
    var secretKey = getSheetSecretKey();
    if (!webhookUrl || webhookUrl.indexOf("https://") !== 0) {
      return Promise.resolve({ skipped: true });
    }
    if (!secretKey) {
      return Promise.resolve({ skipped: true, reason: "secret_missing" });
    }
    var body = {
      app: "tsukiyomi-wonderland",
      secretKey: secretKey,
      recordType: recordType,
      savedAt: new Date().toISOString(),
      page: window.location.pathname.split("/").pop() || "",
      profile: collectProfileFromParams(),
      payload: payload || {}
    };
    var formBody = new URLSearchParams();
    formBody.set("secretKey", secretKey);
    formBody.set("data", JSON.stringify(body));
    return fetch(webhookUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: formBody.toString()
    }).then(function () {
      return { ok: true, opaque: true };
    }).catch(function (error) {
      return { ok: false, error: error };
    });
  }

  function setupDiary() {
    var textarea = document.querySelector("[data-diary-day]");
    if (!textarea) return;
    var day = textarea.getAttribute("data-diary-day");
    var status = document.querySelector("[data-save-status]");
    var saveButton = document.querySelector("[data-save-diary]");
    var lineFields = Array.prototype.slice.call(document.querySelectorAll("[data-diary-day-line]"));
    var itemPhotoInput = document.querySelector("[data-diary-item-photo]");
    var itemPreview = document.querySelector("[data-diary-item-preview]");
    var itemPhotoKey = storageKey(day) + "_item_photo";

    function stripLinePrefix(value) {
      return (value || "").replace(/^\s*[1-4][\.\-:：、\s]*/, "").trim();
    }

    function splitEntryIntoLines(text) {
      var rows = (text || "").replace(/\r/g, "").split("\n")
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return line !== ""; })
        .map(stripLinePrefix);
      if (rows.length > 4) {
        rows = rows.slice(0, 3).concat([rows.slice(3).join(" ")]);
      }
      while (rows.length < 4) rows.push("");
      return rows;
    }

    function composeEntry() {
      if (!lineFields.length) return textarea.value || "";
      var rows = lineFields.map(function (field) {
        return (field.value || "").trim();
      });
      var lines = [];
      for (var i = 0; i < rows.length; i++) {
        if (rows[i]) lines.push((i + 1) + " " + rows[i]);
      }
      return lines.join("\n");
    }

    function renderItemPhoto() {
      if (!itemPreview) return;
      var image = localStorage.getItem(itemPhotoKey) || "";
      if (image) {
        var photoSource = localStorage.getItem(itemPhotoKey + "_source") || "";
        var saveNoteHtml = photoSource === "camera"
          ? '<div class="photo-local-note">' +
              '<p class="photo-local-note__text">📸 カメラロールには自動で保存されていません。</p>' +
              '<a class="photo-dl-btn" href="' + image + '" download="月読み日記-Day' + day + '.jpg">📥 写真を保存する</a>' +
              '<p class="photo-local-note__text" style="margin-top:8px;">① 上のボタンで写真を保存したら<br>② 「今日の私の写メ」ボタンから保存した写真を選んでください</p>' +
            '</div>'
          : '';
        itemPreview.innerHTML = '<img src="' + image + '" alt="Day' + day + 'の整えアイテム写真">' + saveNoteHtml;
      } else {
        itemPreview.innerHTML = '<span>写真を選ぶと、ここに表示されます。</span>';
      }
    }

    function saveItemPhoto(file) {
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var image = new Image();
        image.onload = function () {
          var canvas = document.createElement("canvas");
          var max = 900;
          var scale = Math.min(1, max / Math.max(image.width, image.height));
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          var ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          localStorage.setItem(itemPhotoKey, canvas.toDataURL("image/jpeg", .78));
          localStorage.setItem(itemPhotoKey + "_source", "file");
          renderItemPhoto();
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    }

    var savedValue = window.TsukiyomiWonderland.loadDay(day);
    textarea.value = savedValue;
    if (lineFields.length) {
      var initialRows = splitEntryIntoLines(savedValue);
      lineFields.forEach(function (field, index) {
        field.value = initialRows[index] || "";
        field.addEventListener("input", function () {
          textarea.value = composeEntry();
        });
      });
      textarea.value = composeEntry();
    }
    if (itemPhotoInput) {
      itemPhotoInput.addEventListener("change", function () {
        saveItemPhoto(itemPhotoInput.files && itemPhotoInput.files[0]);
      });
      renderItemPhoto();
    }
    if (saveButton) {
      saveButton.addEventListener("click", function () {
        var value = composeEntry();
        textarea.value = value;
        window.TsukiyomiWonderland.saveDay(day, value);
        syncToSheet("day_diary", {
          day: day,
          entry: value || "",
          hasItemPhoto: !!(localStorage.getItem(itemPhotoKey) || "")
        });
        if (status) {
          status.textContent = "月読み日記に保存しました。";
          window.setTimeout(function () {
            status.textContent = "";
          }, 2600);
        }
      });
    }
  }

  function setupMoonItemOracle() {
    var root = document.querySelector("[data-moon-item-oracle]");
    if (!root) return;
    var zodiacSelect = root.querySelector("[data-oracle-zodiac]");
    var shukuSelect = root.querySelector("[data-oracle-shuku]");
    var applyButton = root.querySelector("[data-oracle-apply]");
    var oracleStatus = root.querySelector("[data-oracle-status]");
    var itemView = root.querySelector("[data-oracle-item]");
    var mixView = root.querySelector("[data-oracle-mix]");
    var shukuThemeView = root.querySelector("[data-oracle-shuku-theme]");
    var zodiacThemeView = root.querySelector("[data-oracle-zodiac-theme]");
    var intuitionView = root.querySelector("[data-oracle-intuition]");
    var diaryLines = Array.prototype.slice.call(document.querySelectorAll("[data-diary-day-line]"));
    var rows = Array.isArray(window.MoonItemOracleData) ? window.MoonItemOracleData : [];
    if (!rows.length || !zodiacSelect || !shukuSelect) return;
    var params = getParams();
    var selectedKey = STORAGE_PREFIX + "item_oracle_selected";
    var oracleSnapshotKey = STORAGE_PREFIX + "item_oracle_snapshot_day2";
    var current = null;

    var zodiacs = [];
    var shukus = [];
    rows.forEach(function (row) {
      if (zodiacs.indexOf(row.zodiac) === -1) zodiacs.push(row.zodiac);
      if (shukus.indexOf(row.shuku) === -1) shukus.push(row.shuku);
    });

    zodiacSelect.innerHTML = zodiacs.map(function (name) {
      return '<option value="' + name + '">' + name + '</option>';
    }).join("");
    shukuSelect.innerHTML = shukus.map(function (name) {
      return '<option value="' + name + '">' + name + '</option>';
    }).join("");

    function setStatus(message) {
      if (!oracleStatus) return;
      oracleStatus.textContent = message || "";
      if (!message) return;
      window.setTimeout(function () {
        oracleStatus.textContent = "";
      }, 2400);
    }

    function render() {
      var zodiac = zodiacSelect.value;
      var shuku = shukuSelect.value;
      current = rows.find(function (row) {
        return row.zodiac === zodiac && row.shuku === shuku;
      });
      localStorage.setItem(selectedKey, JSON.stringify({ zodiac: zodiac, shuku: shuku }));
      if (!current) {
        itemView.textContent = "該当するアイテムが見つかりませんでした。";
        mixView.textContent = "";
        shukuThemeView.textContent = "";
        zodiacThemeView.textContent = "";
        intuitionView.textContent = "";
        return;
      }
      itemView.textContent = "今日の整えアイテム： " + current.item;
      mixView.textContent = current.mixTheme ? "掛け合わせテーマ： " + current.mixTheme : "";
      shukuThemeView.textContent = current.shukuTheme ? "宿曜テーマ： " + current.shukuTheme : "";
      zodiacThemeView.textContent = current.zodiacTheme ? "星座テーマ： " + current.zodiacTheme : "";
      intuitionView.textContent = current.intuitionRule ? "受け取りのヒント： " + current.intuitionRule : "";
      localStorage.setItem(oracleSnapshotKey, JSON.stringify({
        savedAt: new Date().toISOString(),
        zodiac: current.zodiac || "",
        shuku: current.shuku || "",
        item: current.item || "",
        mixTheme: current.mixTheme || "",
        shukuTheme: current.shukuTheme || "",
        zodiacTheme: current.zodiacTheme || "",
        intuitionRule: current.intuitionRule || ""
      }));
    }

    function normalizeZodiac(value) {
      if (!value) return "";
      var map = {
        "牡羊": "牡羊座",
        "牡牛": "牡牛座",
        "双子": "双子座",
        "蟹": "蟹座",
        "獅子": "獅子座",
        "乙女": "乙女座",
        "天秤": "天秤座",
        "蠍": "蠍座",
        "射手": "射手座",
        "山羊": "山羊座",
        "水瓶": "水瓶座",
        "魚": "魚座"
      };
      var s = (value || "").replace(/\s/g, "");
      if (map[s]) return map[s];
      if (s.indexOf("座") === -1 && map[s]) return map[s];
      return s;
    }

    function initializeSelection() {
      var defaultZodiac = normalizeZodiac(params.get("zodiac") || params.get("sign") || "");
      var defaultShuku = (params.get("shuku") || params.get("honmei") || params.get("honmeiShuku") || "").replace(/\s/g, "");
      var birth = params.get("birth") || "";
      if (!defaultZodiac && birth) defaultZodiac = zodiacFromBirth(birth);
      if (!defaultZodiac || !defaultShuku) {
        try {
          var saved = JSON.parse(localStorage.getItem(selectedKey) || "{}");
          defaultZodiac = defaultZodiac || normalizeZodiac(saved.zodiac || "");
          defaultShuku = defaultShuku || (saved.shuku || "");
        } catch (e) {}
      }
      if (defaultZodiac && zodiacs.indexOf(defaultZodiac) !== -1) zodiacSelect.value = defaultZodiac;
      if (defaultShuku && shukus.indexOf(defaultShuku) !== -1) shukuSelect.value = defaultShuku;
    }

    function applyToDiary() {
      if (!current || !diaryLines.length) {
        setStatus("日記欄が見つからなかったため、反映できませんでした。");
        return;
      }
      if (!diaryLines[0].value.trim()) diaryLines[0].value = current.item || "";
      if (!diaryLines[1].value.trim()) diaryLines[1].value = current.mixTheme || "";
      if (!diaryLines[2].value.trim()) diaryLines[2].value = current.shukuTheme ? "感謝したいこと：" + current.shukuTheme : "";
      if (!diaryLines[3].value.trim()) diaryLines[3].value = current.intuitionRule || "";
      diaryLines[0].dispatchEvent(new Event("input", { bubbles: true }));
      setStatus("占い結果を日記欄に反映しました。");
    }

    zodiacSelect.addEventListener("change", render);
    shukuSelect.addEventListener("change", render);
    if (applyButton) applyButton.addEventListener("click", applyToDiary);
    initializeSelection();
    render();
  }

  function setupChallengeCalendar() {
    var shell = document.querySelector("[data-challenge-day]");
    var calendar = document.querySelector("[data-challenge-calendar]");
    if (!shell || !calendar) return;
    var currentDay = Number(shell.getAttribute("data-challenge-day") || "0");
    if (!currentDay) return;
    var search = window.location.search || "";
    var items = [];
    for (var day = 1; day <= 7; day++) {
      var isCurrent = day === currentDay;
      var cls = "challenge-calendar-day" + (isCurrent ? " is-current" : "");
      var href = "challenge_day" + day + "_sync.html" + search;
      items.push(
        '<a class="' + cls + '" href="' + href + '">' +
          '<span>Day ' + day + '</span>' +
        "</a>"
      );
    }
    calendar.innerHTML = '<div class="challenge-calendar-title">7日間チャレンジ</div><div class="challenge-calendar-grid">' + items.join("") + "</div>";
  }

  function setupYearJourney() {
    var root = document.querySelector("[data-year-journey]");
    var grid = document.querySelector("[data-year-journey-grid]");
    if (!root || !grid) return;
    var signs = [
      { name: "双子座", label: "第1章" },
      { name: "蟹座", label: "第2章" },
      { name: "獅子座", label: "第3章" },
      { name: "乙女座", label: "第4章" },
      { name: "天秤座", label: "第5章" },
      { name: "蠍座", label: "第6章" },
      { name: "射手座", label: "第7章" },
      { name: "山羊座", label: "第8章" },
      { name: "水瓶座", label: "第9章" },
      { name: "魚座", label: "第10章" },
      { name: "牡羊座", label: "第11章" },
      { name: "牡牛座", label: "第12章" }
    ];
    var query = window.location.search || "";
    var items = signs.map(function (sign) {
      return (
        '<a class="year-journey-card" href="moon_year_chapter.html?zodiac=' + encodeURIComponent(sign.name) + query + '">' +
          "<span>" + sign.label + "</span>" +
          "<strong>" + sign.name + "新月の章</strong>" +
          "<small>27宿のお題アイテムを整える</small>" +
        "</a>"
      );
    });
    grid.innerHTML = items.join("");
  }

  function setupYearChapter() {
    var root = document.querySelector("[data-year-chapter]");
    if (!root) return;
    var list = root.querySelector("[data-year-list]");
    var select = root.querySelector("[data-year-zodiac]");
    var summary = root.querySelector("[data-year-summary]");
    var title = root.querySelector("[data-year-title]");
    var sub = root.querySelector("[data-year-sub]");
    var rows = Array.isArray(window.MoonItemOracleData) ? window.MoonItemOracleData : [];
    if (!list || !select || !rows.length) return;

    var params = getParams();
    var signList = [];
    rows.forEach(function (row) {
      if (signList.indexOf(row.zodiac) === -1) signList.push(row.zodiac);
    });
    select.innerHTML = signList.map(function (z) {
      return '<option value="' + z + '">' + z + "</option>";
    }).join("");

    var selected = params.get("zodiac") || zodiacFromBirth(params.get("birth") || "") || "";
    if (selected && signList.indexOf(selected) !== -1) select.value = selected;

    function itemKey(zodiac, shuku, suffix) {
      return STORAGE_PREFIX + "year_oracle_" + encodeURIComponent(zodiac) + "_" + encodeURIComponent(shuku) + "_" + suffix;
    }

    function render() {
      var zodiac = select.value;
      var chapterRows = rows.filter(function (row) {
        return row.zodiac === zodiac;
      }).sort(function (a, b) {
        return (a.no || 0) - (b.no || 0);
      });
      if (title) title.textContent = zodiac + "新月の章";
      if (sub) sub.textContent = "27日間のお題アイテムを、写メと感謝でパワーアイテムに育てる";

      var filledCount = 0;
      var cards = chapterRows.map(function (row, idx) {
        var text = localStorage.getItem(itemKey(zodiac, row.shuku, "note")) || "";
        var photo = localStorage.getItem(itemKey(zodiac, row.shuku, "photo")) || "";
        var savedAt = localStorage.getItem(itemKey(zodiac, row.shuku, "savedAt")) || "";
        if (text.trim() || photo) filledCount += 1;
        var photoHtml = photo
          ? '<img src="' + photo + '" alt="' + row.shuku + 'のお題アイテム写真">'
          : '<span>写メを選ぶとここに表示されます。</span>';
        var dateHtml = savedAt ? '<p class="year-entry-date">保存日：' + new Date(savedAt).toLocaleString("ja-JP") + "</p>" : "";
        return (
          '<article class="year-entry-card" data-year-card data-zodiac="' + zodiac + '" data-shuku="' + row.shuku + '">' +
            '<header>' +
              "<span>Day " + (idx + 1) + " / " + row.shuku + "</span>" +
              "<strong>お題アイテム： " + escapeHtml(row.item || "") + "</strong>" +
            "</header>" +
            '<p class="year-entry-meta">' + escapeHtml(row.mixTheme || "") + "</p>" +
            '<div class="year-entry-photo" data-year-photo-preview="' + row.shuku + '">' + photoHtml + "</div>" +
            '<label class="moon-item-upload-label year-upload-label">写メを追加' +
              '<input type="file" accept="image/*" data-year-photo-input="' + row.shuku + '">' +
            "</label>" +
            '<textarea class="year-entry-note" data-year-note-input="' + row.shuku + '" placeholder="今日の気づき・感謝・明日の一歩を記録します。">' + escapeHtml(text).replace(/<br>/g, "\n") + "</textarea>" +
            dateHtml +
          "</article>"
        );
      });
      list.innerHTML = cards.join("");
      if (summary) summary.textContent = "27日中 " + filledCount + "日が記録されています";
    }

    function savePhoto(zodiac, shuku, file) {
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var image = new Image();
        image.onload = function () {
          var canvas = document.createElement("canvas");
          var max = 900;
          var scale = Math.min(1, max / Math.max(image.width, image.height));
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          var ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          localStorage.setItem(itemKey(zodiac, shuku, "photo"), canvas.toDataURL("image/jpeg", .78));
          localStorage.setItem(itemKey(zodiac, shuku, "savedAt"), new Date().toISOString());
          render();
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    }

    list.addEventListener("change", function (event) {
      var target = event.target;
      var shuku = target.getAttribute("data-year-photo-input");
      if (!shuku) return;
      var file = target.files && target.files[0];
      savePhoto(select.value, shuku, file);
    });

    list.addEventListener("input", function (event) {
      var target = event.target;
      var shuku = target.getAttribute("data-year-note-input");
      if (!shuku) return;
      localStorage.setItem(itemKey(select.value, shuku, "note"), target.value || "");
      localStorage.setItem(itemKey(select.value, shuku, "savedAt"), new Date().toISOString());
    });

    select.addEventListener("change", render);
    render();
  }

  function setupManual() {
    var manual = document.querySelector("[data-manual-list]");
    if (!manual) return;
    var days = [
      { day: "1", chapter: "序章", place: "自分発見ムーンゲート", theme: "受け取った言葉", question: "鑑定書の中で、今日の心に残った言葉は何ですか？" },
      { day: "2", chapter: "第1章", place: "月鏡の湖", theme: "飲み物と感謝", question: "今日の一杯は、私にどんな整えの力をくれている？" },
      { day: "3", chapter: "第2章", place: "整えの広場", theme: "身近なモノへの感謝", question: "今日の開運アイテムに、どんな「ありがとう」を伝えますか？" },
      { day: "4", chapter: "第3章", place: "シャドウの森", theme: "過去の因果", question: "あの時の私は、何を守ろうとしていた？" },
      { day: "5", chapter: "第4章", place: "月の庭園", theme: "感謝", question: "今日、ありがとうと思えたことは何ですか？" },
      { day: "6", chapter: "第5章", place: "願いの丘", theme: "本当の願い", question: "本当は私は、どう生きたい？" },
      { day: "7", chapter: "終章", place: "月の城", theme: "天命の芽", question: "この7日間で、私は何に気づきましたか？" }
    ];
    var filledCount = 0;
    manual.innerHTML = days.map(function (item) {
      var value = window.TsukiyomiWonderland.loadDay(item.day).trim();
      if (value) filledCount += 1;
      return '<article class="manual-chapter">' +
        '<div class="manual-chapter-head">' +
          '<span>' + item.chapter + ' / Day' + item.day + '</span>' +
          '<h2>' + item.place + '</h2>' +
          '<p>' + item.theme + '</p>' +
        '</div>' +
        '<div class="manual-question">' + item.question + '</div>' +
        '<div class="manual-entry">' + (value ? escapeHtml(value) : '<span class="manual-empty">まだ記録がありません。Day' + item.day + 'の月読み日記を書くと、ここに自分の言葉が残ります。</span>') + '</div>' +
      '</article>';
    }).join("");
    var progress = document.querySelector("[data-manual-progress]");
    if (progress) progress.textContent = "7章中 " + filledCount + "章が記録されています";
  }

  function setupThemeSelect() {
    var root = document.querySelector("[data-theme-select]");
    if (!root) return;
    var savedTheme = localStorage.getItem(STORAGE_PREFIX + "selected_theme") || "";
    var status = document.querySelector("[data-theme-status]");
    root.querySelectorAll("[data-theme-choice]").forEach(function (button) {
      var theme = button.getAttribute("data-theme-choice");
      if (theme === savedTheme) button.classList.add("is-selected");
      button.addEventListener("click", function () {
        root.querySelectorAll("[data-theme-choice]").forEach(function (item) {
          item.classList.remove("is-selected");
        });
        button.classList.add("is-selected");
        localStorage.setItem(STORAGE_PREFIX + "selected_theme", theme);
        localStorage.setItem(STORAGE_PREFIX + "selected_theme_label", button.getAttribute("data-theme-label") || "");
        if (status) {
          status.textContent = (button.getAttribute("data-theme-label") || "テーマ") + "を選びました。次の新月から、このテーマで深めていきます。";
        }
      });
    });
  }

  function setupZodiacChapter() {
    var root = document.querySelector("[data-zodiac-chapter]");
    if (!root) return;
    var sign = root.getAttribute("data-zodiac-chapter") || "gemini";
    var theme = localStorage.getItem(STORAGE_PREFIX + "selected_theme") || "love";
    var label = localStorage.getItem(STORAGE_PREFIX + "selected_theme_label") || "愛情運";
    var zodiacData = {
      gemini: {
        savedName: "gemini",
        themes: {
          love: {
            label: "愛情運",
            title: "愛情運の私",
            focus: "どんな言葉をかけられると、私は安心できる？",
            hint: "愛され方、伝え方、心地よい距離感を見つめます。"
          },
          work: {
            label: "仕事運",
            title: "仕事運の私",
            focus: "どんな伝え方をすると、私は力を発揮できる？",
            hint: "才能の使い方、伝える力、働きやすい環境を見つめます。"
          },
          relation: {
            label: "人間関係運",
            title: "人間関係運の私",
            focus: "どんな会話の距離感だと、私は疲れにくい？",
            hint: "境界線、受け取り方、安心できる関わり方を見つめます。"
          }
        }
      },
      cancer: {
        savedName: "cancer",
        themes: {
          love: {
            label: "愛情運",
            title: "愛情運の私",
            focus: "私はどんな関係の中で、心から安心できる？",
            hint: "守られたい気持ち、甘え方、安心できる居場所を見つめます。"
          },
          work: {
            label: "仕事運",
            title: "仕事運の私",
            focus: "私はどんな職場や仲間の中で、力を出しやすい？",
            hint: "安心できる環境、支え合える関係、心が守られる働き方を見つめます。"
          },
          relation: {
            label: "人間関係運",
            title: "人間関係運の私",
            focus: "私はどんな距離感なら、心を閉じずにいられる？",
            hint: "心の境界線、安心する居場所、無理をしない関わり方を見つめます。"
          }
        }
      },
      leo: {
        savedName: "leo",
        themes: {
          love: {
            label: "愛情運",
            title: "愛情運の私",
            focus: "私はどんな時に、愛されている喜びを素直に受け取れる？",
            hint: "自分らしい魅力、喜びの表現、大切にされる実感を見つめます。"
          },
          work: {
            label: "仕事運",
            title: "仕事運の私",
            focus: "私はどんな役割や表現で、自分らしく輝ける？",
            hint: "評価されたい力、創造性、前に出るタイミングを見つめます。"
          },
          relation: {
            label: "人間関係運",
            title: "人間関係運の私",
            focus: "私はどんな場面で、自分らしさを安心して出せる？",
            hint: "遠慮しすぎるクセ、喜びの共有、心地よい自己表現を見つめます。"
          }
        }
      },
      virgo: {
        savedName: "virgo",
        themes: {
          love: {
            label: "愛情運",
            title: "愛情運の私",
            focus: "私はどんな小さな気づかいを受け取ると、大切にされていると感じる？",
            hint: "日々の思いやり、整った安心感、愛情表現の細やかさを見つめます。"
          },
          work: {
            label: "仕事運",
            title: "仕事運の私",
            focus: "私はどんな整え方や習慣で、仕事の力を発揮しやすい？",
            hint: "段取り、得意なサポート、無理なく続く働き方を見つめます。"
          },
          relation: {
            label: "人間関係運",
            title: "人間関係運の私",
            focus: "私はどこまで整えようとすると、人間関係で疲れてしまう？",
            hint: "気づかいの境界線、頼られ方、無理をしない整え方を見つめます。"
          }
        }
      },
      libra: {
        savedName: "libra",
        themes: {
          love: {
            label: "愛情運",
            title: "愛情運の私",
            focus: "私はどんな関係なら、対等で心地よく愛し合える？",
            hint: "愛のバランス、合わせすぎない関わり方、心地よいパートナーシップを見つめます。"
          },
          work: {
            label: "仕事運",
            title: "仕事運の私",
            focus: "私はどんな人と組むと、仕事の力が自然に広がる？",
            hint: "協力関係、役割のバランス、調和の中で力を出す働き方を見つめます。"
          },
          relation: {
            label: "人間関係運",
            title: "人間関係運の私",
            focus: "私はどんな関係性なら、無理なく自分でいられる？",
            hint: "距離感、対等さ、合わせすぎない人間関係を見つめます。"
          }
        }
      },
      scorpio: {
        savedName: "scorpio",
        themes: {
          love: {
            label: "愛情運",
            title: "愛情運の私",
            focus: "私はどんな関係なら、深い本音を安心して預けられる？",
            hint: "信頼、絆、心の奥にある願いを、無理なく見つめます。"
          },
          work: {
            label: "仕事運",
            title: "仕事運の私",
            focus: "私はどんな仕事なら、深く向き合う力を活かせる？",
            hint: "集中力、探究心、最後まで寄り添う力を、仕事の中で見つめます。"
          },
          relation: {
            label: "人間関係運",
            title: "人間関係運の私",
            focus: "私はどんな相手になら、本当の気持ちを少しずつ話せる？",
            hint: "信頼できる距離、心を開くタイミング、深くつながる安心感を見つめます。"
          }
        }
      },
      sagittarius: {
        savedName: "sagittarius",
        themes: {
          love: {
            label: "愛情運",
            title: "愛情運の私",
            focus: "私はどんな関係なら、自由な心で未来を描ける？",
            hint: "一緒に広がる関係、信じ合う距離、前向きな愛の育て方を見つめます。"
          },
          work: {
            label: "仕事運",
            title: "仕事運の私",
            focus: "私はどんな学びや挑戦の中で、仕事の可能性を広げられる？",
            hint: "探求心、成長できる環境、未来へ向かう働き方を見つめます。"
          },
          relation: {
            label: "人間関係運",
            title: "人間関係運の私",
            focus: "私はどんな人たちといると、前向きな気持ちを取り戻せる？",
            hint: "視野を広げてくれる関係、励まし合える距離、自由で安心なつながりを見つめます。"
          }
        }
      },
      capricorn: {
        savedName: "capricorn",
        themes: {
          love: {
            label: "愛情運",
            title: "愛情運の私",
            focus: "私はどんな約束や積み重ねの中で、安心して愛を育てられる？",
            hint: "信頼の土台、続いていく安心感、現実の中で育つ愛を見つめます。"
          },
          work: {
            label: "仕事運",
            title: "仕事運の私",
            focus: "私はどんな役割や目標があると、着実に力を発揮できる？",
            hint: "責任の持ち方、積み重ねる力、現実を形にする働き方を見つめます。"
          },
          relation: {
            label: "人間関係運",
            title: "人間関係運の私",
            focus: "私はどんな信頼関係なら、長く安心して関われる？",
            hint: "約束、境界線、無理なく続く関係の土台を見つめます。"
          }
        }
      },
      aquarius: {
        savedName: "aquarius",
        themes: {
          love: {
            label: "愛情運",
            title: "愛情運の私",
            focus: "私はどんな関係なら、自分らしさを失わずに愛を育てられる？",
            hint: "自由な距離感、尊重し合う愛、未来を一緒に見られる関係を見つめます。"
          },
          work: {
            label: "仕事運",
            title: "仕事運の私",
            focus: "私はどんな新しい発想やつながりの中で、仕事の可能性を広げられる？",
            hint: "個性、未来への視点、これまでにない働き方を見つめます。"
          },
          relation: {
            label: "人間関係運",
            title: "人間関係運の私",
            focus: "私はどんな仲間といると、自分らしく呼吸できる？",
            hint: "価値観の合うつながり、自由な関係性、違いを認め合う安心感を見つめます。"
          }
        }
      },
      pisces: {
        savedName: "pisces",
        themes: {
          love: {
            label: "愛情運",
            title: "愛情運の私",
            focus: "私はどんなやさしさの中で、安心して愛を受け取れる？",
            hint: "受け取る愛、心の癒し、無理に背負いすぎない関係を見つめます。"
          },
          work: {
            label: "仕事運",
            title: "仕事運の私",
            focus: "私はどんな仕事なら、感性や思いやりを無理なく活かせる？",
            hint: "共感力、癒す力、心をすり減らさない働き方を見つめます。"
          },
          relation: {
            label: "人間関係運",
            title: "人間関係運の私",
            focus: "私はどんな境界線があると、人にやさしくしながら自分も守れる？",
            hint: "共感しすぎる時の整え方、心の境界線、安心して寄り添う距離を見つめます。"
          }
        }
      },
      aries: {
        savedName: "aries",
        themes: {
          love: {
            label: "愛情運",
            title: "愛情運の私",
            focus: "私はどんな愛なら、自分の気持ちをまっすぐ大切にできる？",
            hint: "始める勇気、素直な気持ち、自分を後回しにしない愛を見つめます。"
          },
          work: {
            label: "仕事運",
            title: "仕事運の私",
            focus: "私はどんな一歩から、仕事の流れを動かし始められる？",
            hint: "行動力、決断、まず始めてみる力を、無理のない形で見つめます。"
          },
          relation: {
            label: "人間関係運",
            title: "人間関係運の私",
            focus: "私はどんな場面で、自分の意思を安心して出せる？",
            hint: "遠慮しすぎない関わり方、最初の一言、自分の気持ちを守る力を見つめます。"
          }
        }
      },
      taurus: {
        savedName: "taurus",
        themes: {
          love: {
            label: "愛情運",
            title: "愛情運の私",
            focus: "私はどんな愛され方をすると、心と体が安心できる？",
            hint: "触れられる安心感、心地よいペース、受け取る豊かさを見つめます。"
          },
          work: {
            label: "仕事運",
            title: "仕事運の私",
            focus: "私はどんな環境なら、落ち着いて才能を育てられる？",
            hint: "安定感、五感が喜ぶ環境、着実に育つ働き方を見つめます。"
          },
          relation: {
            label: "人間関係運",
            title: "人間関係運の私",
            focus: "私はどんな距離やペースなら、人と安心して関われる？",
            hint: "急かされない関係、心地よい距離感、自分の感覚を信じる力を見つめます。"
          }
        }
      }
    };
    var signData = zodiacData[sign] || zodiacData.gemini;
    var data = signData.themes[theme] || signData.themes.love;
    var themeLabel = document.querySelector("[data-selected-theme-label]");
    var themeTitle = document.querySelector("[data-selected-theme-title]");
    var themeFocus = document.querySelector("[data-selected-theme-focus]");
    var themeHint = document.querySelector("[data-selected-theme-hint]");
    var diary = document.querySelector("[data-zodiac-diary]");
    if (themeLabel) themeLabel.textContent = label || data.label;
    if (themeTitle) themeTitle.textContent = data.title;
    if (themeFocus) themeFocus.textContent = data.focus;
    if (themeHint) themeHint.textContent = data.hint;
    if (diary) {
      var key = STORAGE_PREFIX + "zodiac_" + signData.savedName + "_" + theme;
      diary.value = localStorage.getItem(key) || "";
      var save = document.querySelector("[data-save-zodiac]");
      var status = document.querySelector("[data-zodiac-status]");
      if (save) {
        save.addEventListener("click", function () {
          localStorage.setItem(key, diary.value || "");
          localStorage.setItem(key + "_savedAt", new Date().toISOString());
          if (status) {
            status.textContent = "月読み日記の章に保存しました。";
            window.setTimeout(function () {
              status.textContent = "";
            }, 2600);
          }
        });
      }
    }
  }

  function setupZodiacComplete() {
    var book = document.querySelector("[data-zodiac-book]");
    if (!book) return;
    var theme = localStorage.getItem(STORAGE_PREFIX + "selected_theme") || "love";
    var label = localStorage.getItem(STORAGE_PREFIX + "selected_theme_label") || "愛情運";
    var chapters = [
      { sign: "gemini", title: "第1章 / 双子座新月", theme: "言葉・本音・伝える", question: "私はどんな言葉で、自分を知っていく？" },
      { sign: "cancer", title: "第2章 / 蟹座新月", theme: "安心・居場所・心を守る", question: "私はどんな場所で、心から安心できる？" },
      { sign: "leo", title: "第3章 / 獅子座新月", theme: "自己表現・喜び・輝き", question: "私はどんな時、自分らしく輝ける？" },
      { sign: "virgo", title: "第4章 / 乙女座新月", theme: "整える・役に立つ・習慣", question: "私はどんな整え方で、日々の力を取り戻せる？" },
      { sign: "libra", title: "第5章 / 天秤座新月", theme: "関係性・調和・バランス", question: "私はどんな関係性なら、無理なく自分でいられる？" },
      { sign: "scorpio", title: "第6章 / 蠍座新月", theme: "深い本音・信頼・変容", question: "私はどんな相手になら、本当の気持ちを少しずつ話せる？" },
      { sign: "sagittarius", title: "第7章 / 射手座新月", theme: "希望・探求・未来へ進む力", question: "私はどんな人たちといると、前向きな気持ちを取り戻せる？" },
      { sign: "capricorn", title: "第8章 / 山羊座新月", theme: "土台・積み重ね・形にする力", question: "私はどんな信頼関係なら、長く安心して関われる？" },
      { sign: "aquarius", title: "第9章 / 水瓶座新月", theme: "自由・未来・自分らしいつながり", question: "私はどんな仲間といると、自分らしく呼吸できる？" },
      { sign: "pisces", title: "第10章 / 魚座新月", theme: "癒し・ゆるし・受け取る力", question: "私はどんな境界線があると、人にやさしくしながら自分も守れる？" },
      { sign: "aries", title: "第11章 / 牡羊座新月", theme: "始まり・勇気・自分の意思", question: "私はどんな場面で、自分の意思を安心して出せる？" },
      { sign: "taurus", title: "第12章 / 牡牛座新月", theme: "安心・感覚・豊かさ", question: "私はどんな距離やペースなら、人と安心して関われる？" }
    ];
    var filledCount = 0;
    book.innerHTML = chapters.map(function (chapter) {
      var key = STORAGE_PREFIX + "zodiac_" + chapter.sign + "_" + theme;
      var value = (localStorage.getItem(key) || "").trim();
      if (value) filledCount += 1;
      return '<article class="manual-chapter">' +
        '<div class="manual-chapter-head">' +
          '<span>' + chapter.title + '</span>' +
          '<h2>' + chapter.theme + '</h2>' +
          '<p>' + label + 'の私</p>' +
        '</div>' +
        '<div class="manual-question">' + chapter.question + '</div>' +
        '<div class="manual-entry">' + (value ? escapeHtml(value) : '<span class="manual-empty">この章はまだ記録がありません。月の巡りに合わせて書くと、ここに自分の言葉が残ります。</span>') + '</div>' +
      '</article>';
    }).join("");
    var progress = document.querySelector("[data-zodiac-progress]");
    if (progress) progress.textContent = "12章中 " + filledCount + "章が記録されています";
    var selected = document.querySelector("[data-zodiac-selected-theme]");
    if (selected) selected.textContent = label + "を入口にした、私の月読みBOOK";
  }

  function setupMoonDiaryBook() {
    var textarea = document.querySelector("[data-moon-diary-book]");
    if (!textarea) return;
    var key = STORAGE_PREFIX + "moon_diary_book_today";
    var status = document.querySelector("[data-moon-diary-status]");
    var saveButton = document.querySelector("[data-save-moon-diary-book]");
    var savedAt = document.querySelector("[data-moon-diary-saved-at]");
    var savedEntry = document.querySelector("[data-moon-diary-entry]");
    var savedDateView = document.querySelector("[data-moon-diary-entry-date]");
    var oracleDateView = document.querySelector("[data-moon-oracle-date]");
    var oracleEntryView = document.querySelector("[data-moon-oracle-entry]");
    var oracleSnapshotKey = STORAGE_PREFIX + "item_oracle_snapshot_day2";
    var storyList = document.querySelector("[data-diary-story-list]");
    var highlightList = document.querySelector("[data-diary-highlight-list]");
    var rewardCrystals = document.querySelector("[data-reward-crystals]");
    var rewardStatus = document.querySelector("[data-reward-status]");
    var rewardLink = document.querySelector("[data-reward-link]");
    function renderSavedEntry() {
      var value = (localStorage.getItem(key) || "").trim();
      var savedDateValue = localStorage.getItem(key + "_savedAt") || "";
      if (savedEntry) {
        savedEntry.innerHTML = value ? escapeHtml(value) : '<span class="manual-empty">まだ記録がありません。今日の月読みワークを書くと、ここに一冊のページとして残ります。</span>';
      }
      if (savedDateView) {
        savedDateView.textContent = value && savedDateValue ? "保存日：" + new Date(savedDateValue).toLocaleString("ja-JP") : "保存すると、ここに日付が残ります";
      }
      if (oracleEntryView || oracleDateView) {
        var raw = localStorage.getItem(oracleSnapshotKey) || "";
        var snapshot = null;
        try {
          snapshot = raw ? JSON.parse(raw) : null;
        } catch (e) {
          snapshot = null;
        }
        if (snapshot && snapshot.item) {
          if (oracleDateView) {
            oracleDateView.textContent = "最終更新：" + new Date(snapshot.savedAt || new Date().toISOString()).toLocaleString("ja-JP");
          }
          if (oracleEntryView) {
            var lines = [];
            lines.push("星座：" + (snapshot.zodiac || ""));
            lines.push("宿：" + (snapshot.shuku || ""));
            lines.push("今日の整えアイテム：" + (snapshot.item || ""));
            if (snapshot.mixTheme) lines.push("掛け合わせテーマ：" + snapshot.mixTheme);
            if (snapshot.shukuTheme) lines.push("宿曜テーマ：" + snapshot.shukuTheme);
            if (snapshot.zodiacTheme) lines.push("星座テーマ：" + snapshot.zodiacTheme);
            if (snapshot.intuitionRule) lines.push("受け取りのヒント：" + snapshot.intuitionRule);
            oracleEntryView.innerHTML = escapeHtml(lines.join("\n"));
          }
        } else {
          if (oracleDateView) oracleDateView.textContent = "まだオラクル記録はありません";
          if (oracleEntryView) {
            oracleEntryView.innerHTML = '<span class="manual-empty">月鏡の湖でオラクルを引くと、ここに整えアイテムと受け取ったテーマが残ります。</span>';
          }
        }
      }
      if (storyList) {
        var dayMeta = [
          { day: 1, place: "自分発見ムーンゲート" },
          { day: 2, place: "月鏡の湖" },
          { day: 3, place: "整えの広場" },
          { day: 4, place: "シャドウの森" },
          { day: 5, place: "月の庭園" },
          { day: 6, place: "願いの丘" },
          { day: 7, place: "月の城" }
        ];
        var blocks = [];
        dayMeta.forEach(function (item) {
          var text = (localStorage.getItem(storageKey(String(item.day))) || "").trim();
          var photo = localStorage.getItem(storageKey(String(item.day)) + "_item_photo") || "";
          var updated = localStorage.getItem(storageKey(String(item.day)) + "_savedAt") || "";
          if (!text && !photo) return;
          var photoHtml = photo
            ? '<img src="' + photo + '" alt="Day' + item.day + 'の記録写真">'
            : '<div class="diary-story-no-photo">写真なし</div>';
          var dateHtml = updated ? '<p class="diary-story-date">保存日：' + new Date(updated).toLocaleString("ja-JP") + '</p>' : "";
          blocks.push(
            '<article class="diary-story-card">' +
              '<header><span>Day ' + item.day + "</span><strong>" + item.place + "</strong></header>" +
              '<div class="diary-story-media">' + photoHtml + "</div>" +
              dateHtml +
              '<div class="diary-story-entry">' + (text ? escapeHtml(text) : '<span class="manual-empty">記録はまだありません。</span>') + "</div>" +
            "</article>"
          );
        });
        storyList.innerHTML = blocks.length
          ? blocks.join("")
          : '<p class="manual-empty">まだ記録がありません。7日間チャレンジで写メと日記を保存すると、ここに並びます。</p>';
      }
      if (highlightList) {
        var highlights = [];
        for (var d = 1; d <= 7; d++) {
          var dayText = (localStorage.getItem(storageKey(String(d))) || "").trim();
          if (!dayText) continue;
          var normalized = dayText
            .replace(/\r/g, "\n")
            .split("\n")
            .map(function (line) { return line.trim(); })
            .filter(function (line) { return line !== ""; });
          if (!normalized.length) continue;
          var first = normalized[0].replace(/^\s*[1-4][\.\-:：、\s]*/, "");
          highlights.push('<li><span>Day ' + d + "</span><strong>" + escapeHtml(first) + "</strong></li>");
        }
        highlightList.innerHTML = highlights.length
          ? highlights.join("")
          : '<li class="manual-empty">7日間の記録が増えると、ここに気づきのハイライトが表示されます。</li>';
      }
      if (rewardCrystals || rewardStatus || rewardLink) {
        var done = 0;
        var icons = [];
        for (var day = 1; day <= 7; day++) {
          var hasText = (localStorage.getItem(storageKey(String(day))) || "").trim() !== "";
          var hasPhoto = (localStorage.getItem(storageKey(String(day)) + "_item_photo") || "") !== "";
          var cleared = hasText || hasPhoto;
          if (cleared) done += 1;
          icons.push('<span class="reward-crystal' + (cleared ? " is-on" : "") + '">✦</span>');
        }
        if (rewardCrystals) rewardCrystals.innerHTML = icons.join("");
        if (done >= 7) {
          if (rewardStatus) rewardStatus.textContent = "報酬解放：第2の鑑定書を受け取れます。";
          if (rewardLink) {
            rewardLink.classList.remove("disabled-link");
            rewardLink.removeAttribute("aria-disabled");
            rewardLink.removeAttribute("onclick");
            rewardLink.setAttribute("href", "moon_seed_deep_report.html" + (window.location.search || ""));
          }
        } else {
          if (rewardStatus) rewardStatus.textContent = "達成状況：7日中 " + done + "日。あと" + (7 - done) + "日で報酬が解放されます。";
          if (rewardLink) {
            rewardLink.classList.add("disabled-link");
            rewardLink.setAttribute("aria-disabled", "true");
            rewardLink.setAttribute("onclick", "return false;");
            rewardLink.setAttribute("href", "#");
          }
        }
      }
    }
    textarea.value = localStorage.getItem(key) || "";
    var savedDate = localStorage.getItem(key + "_savedAt") || "";
    if (savedAt && savedDate) {
      savedAt.textContent = "前回保存：" + new Date(savedDate).toLocaleString("ja-JP");
    }
    renderSavedEntry();
    if (saveButton) {
      saveButton.addEventListener("click", function () {
        localStorage.setItem(key, textarea.value || "");
        localStorage.setItem(key + "_savedAt", new Date().toISOString());
        syncToSheet("moon_diary_book", {
          entry: textarea.value || ""
        });
        if (status) {
          status.textContent = "月読み日記BOOKに保存しました。";
          window.setTimeout(function () {
            status.textContent = "";
          }, 2600);
        }
        if (savedAt) savedAt.textContent = "前回保存：" + new Date().toLocaleString("ja-JP");
        renderSavedEntry();
      });
    }
  }

  function renderFirstConcern(root, profile) {
    var section = root.querySelector("[data-deep-first-concern]");
    if (!section) return;
    var concern = (profile.concern || "").trim();
    var q = (profile.q || "").trim();
    if (!concern && !q) return;
    var labelEl = section.querySelector("[data-concern-category]");
    var textEl = section.querySelector("[data-concern-q]");
    if (labelEl) labelEl.textContent = concern || "お悩み";
    if (textEl) textEl.textContent = q || concern;
    section.style.display = "";
  }

  function setupDeepReport() {
    var root = document.querySelector("[data-deep-report]");
    if (!root) return;
    var current = root.querySelector("[data-deep-current]");
    var themes = root.querySelector("[data-deep-themes]");
    var shukuView = root.querySelector("[data-deep-shuku]");
    var next = root.querySelector("[data-deep-next]");
    var params = getParams();
    var texts = [];
    var day2SnapshotKey = STORAGE_PREFIX + "item_oracle_snapshot_day2";

    function normalizeZodiac(value) {
      if (!value) return "";
      var map = {
        "牡羊": "牡羊座",
        "牡牛": "牡牛座",
        "双子": "双子座",
        "蟹": "蟹座",
        "獅子": "獅子座",
        "乙女": "乙女座",
        "天秤": "天秤座",
        "蠍": "蠍座",
        "射手": "射手座",
        "山羊": "山羊座",
        "水瓶": "水瓶座",
        "魚": "魚座"
      };
      var s = (value || "").replace(/\s/g, "");
      if (map[s]) return map[s];
      return s;
    }

    function shukuTypeKey(shuku) {
      var groups = {
        A: ["井宿", "柳宿", "軫宿", "女宿", "壁宿"],
        B: ["昴宿", "参宿", "角宿", "斗宿", "室宿"],
        C: ["畢宿", "星宿", "張宿", "翼宿", "心宿", "奎宿"],
        D: ["觜宿", "鬼宿", "亢宿", "尾宿", "危宿"],
        E: ["氐宿", "房宿", "箕宿", "虚宿", "婁宿", "胃宿"]
      };
      var keys = Object.keys(groups);
      for (var i = 0; i < keys.length; i++) {
        if (groups[keys[i]].indexOf(shuku) !== -1) return keys[i];
      }
      return "";
    }

    function shukuTypeLabel(key) {
      var labels = {
        A: "癒しの月タイプ",
        B: "導きの月タイプ",
        C: "表現の月タイプ",
        D: "変容の月タイプ",
        E: "豊かさ循環タイプ"
      };
      return labels[key] || "";
    }

    function shukuGuidance(typeKey) {
      var guide = {
        A: "受け取る・包む力が土台です。無理に急ぐより、安心を整えるほど流れが育ちます。",
        B: "照らす・示す力が土台です。迷いを言葉にするほど、次の道が見えやすくなります。",
        C: "届ける・表現する力が土台です。感じたことを外へ出すほど、巡りが軽くなります。",
        D: "手放し・刷新する力が土台です。古い思い込みを一つ緩めるたび、未来の扉が開きます。",
        E: "育む・広げる力が土台です。日々の小さな感謝が、豊かさの循環を強くします。"
      };
      return guide[typeKey] || "あなたの記録を土台に、今の整え方をやさしく深めていきましょう。";
    }

    function shukuDeepLine(shuku) {
      var lines = {
        "昴宿": "灯りをともす力がある宿です。自分の本音をやさしく言葉にするほど、周りとの関係が整います。",
        "畢宿": "丁寧に育てる力がある宿です。今日の小さな継続が、未来の安心をしっかり形にしていきます。",
        "觜宿": "切り替えの力がある宿です。不要な思い込みを手放すほど、心の余白に新しい可能性が入ってきます。",
        "参宿": "前へ進める推進力がある宿です。迷いを一歩の行動に変えることで、流れがはっきり動き出します。",
        "井宿": "受け止める器の大きさが魅力の宿です。自分を責めずに整えるほど、人にもやさしさを渡せます。",
        "鬼宿": "刷新する勇気がある宿です。区切りをつける決断が、次のステージへの扉を静かに開きます。",
        "柳宿": "心に寄り添う感受性を持つ宿です。感じたことを否定しない姿勢が、深い癒しにつながります。",
        "星宿": "表現で人を照らす力がある宿です。あなたの言葉やふるまいが、誰かの希望を育てます。",
        "張宿": "輝きを外へ届ける力がある宿です。喜びを隠さず表現するほど、運の巡りが軽やかになります。",
        "翼宿": "人とつながる表現力がある宿です。共感と言葉を重ねることで、信頼の輪が育っていきます。",
        "軫宿": "守り育てる包容力を持つ宿です。安心できる場を整えることが、あなた自身の土台も強くします。",
        "角宿": "道を示す洞察力がある宿です。今の気づきを言語化すると、次に進む方向が明確になります。",
        "亢宿": "変化を受け入れるしなやかさがある宿です。固さをゆるめるほど、新しい出会いと展開が入ってきます。",
        "氐宿": "豊かさを育てる現実力を持つ宿です。日々の整えを積み重ねることで、受け取る器が広がります。",
        "房宿": "恵みを循環させる力がある宿です。受け取った優しさを返すほど、運気の巡りが安定します。",
        "心宿": "想いを強く届ける集中力がある宿です。大切なものを一つ選び抜くことで、人生の軸が整います。",
        "尾宿": "手放しから再生へ向かう力がある宿です。過去を労うほど、次の挑戦に軽やかに向かえます。",
        "箕宿": "実りを広げる発展力を持つ宿です。感謝と行動を重ねることで、豊かさが自然に循環します。",
        "斗宿": "導きの視点を持つ宿です。長い目で流れを見つめると、今日の一歩に確信が宿ります。",
        "女宿": "受容と癒しの感性を持つ宿です。自分の心をやさしく扱うことが、運気を整える近道になります。",
        "虚宿": "静けさの中で育む力を持つ宿です。焦らず整える姿勢が、確かな成長につながります。",
        "危宿": "刷新のタイミングを読む力がある宿です。違和感を見逃さないことで、流れを良い方向へ切り替えられます。",
        "室宿": "未来を照らす導きの宿です。理想を言葉にすることで、現実の選択がぶれにくくなります。",
        "壁宿": "守りと安定を築く宿です。境界線を丁寧に整えるほど、安心して力を発揮できます。",
        "奎宿": "美しく伝える表現力を持つ宿です。感じたことを言葉に残すたび、自分らしさが磨かれていきます。",
        "婁宿": "豊かさを育成する実行力がある宿です。小さな積み上げを信じることで、確かな成果へつながります。",
        "胃宿": "受け取り上手な循環力を持つ宿です。今ある恵みに目を向けるほど、次の豊かさが流れ込みます。"
      };
      return lines[shuku] || "";
    }

    function shukuNextSevenSuggestion(shuku, typeKey) {
      var suggestions = {
        "昴宿": "毎日1回、本音を短い言葉で伝える練習をしてみましょう。",
        "畢宿": "朝か夜に1分、整えノートを書く時間を固定してみましょう。",
        "觜宿": "もう使っていない習慣を一つ手放し、代わりに深呼吸を入れてみましょう。",
        "参宿": "迷ったら3分以内に小さな行動を一つ決めて実行してみましょう。",
        "井宿": "安心できる言葉を自分に一つかける習慣を続けてみましょう。",
        "鬼宿": "区切りたいことを一つ決めて、感謝とともに手放してみましょう。",
        "柳宿": "寝る前に『今日感じたこと』を否定せず1行だけ残してみましょう。",
        "星宿": "心が動いた瞬間を1日1回、言葉にして誰かに共有してみましょう。",
        "張宿": "うれしかったことを1つ、声に出して受け取る練習をしましょう。",
        "翼宿": "感謝を一言メッセージで届ける日を7日間続けてみましょう。",
        "軫宿": "自分の居場所を整える小さな片づけを毎日1か所だけ行いましょう。",
        "角宿": "朝に『今日整えたいこと』を一つ書いてから1日を始めましょう。",
        "亢宿": "違和感を感じた場面をメモし、夜に優先順位を見直してみましょう。",
        "氐宿": "受け取った助けを1日1つ書き出し、感謝の循環を見える化しましょう。",
        "房宿": "与えることと受け取ることを同じだけ意識して記録してみましょう。",
        "心宿": "今週の最重要テーマを一つ決め、それ以外を少し減らしてみましょう。",
        "尾宿": "終わらせたい思い込みを1日1つ言葉にして、区切りをつけましょう。",
        "箕宿": "小さな成果を毎日確認し、『受け取る』言葉で締めくくってみましょう。",
        "斗宿": "7日後の理想状態を先に書き、そこから逆算して1歩決めましょう。",
        "女宿": "自分を労う言葉を毎日1つ書いて、心の安心を育ててみましょう。",
        "虚宿": "静かな時間を1日5分確保し、心の声だけを聞く時間にしましょう。",
        "危宿": "無理のある予定を1つ減らし、余白を先に確保してみましょう。",
        "室宿": "理想の未来に近づく行動を、毎日1つだけ実行してみましょう。",
        "壁宿": "人との境界線を整えるために、『今はここまで』を丁寧に伝えましょう。",
        "奎宿": "感じたことを美しい言葉で1行にまとめる習慣を続けてみましょう。",
        "婁宿": "生活の中で育てたい習慣を1つ選び、同じ時間に続けましょう。",
        "胃宿": "受け取った恵みを3つ書いてから眠る習慣を7日続けてみましょう。"
      };
      var fallback = {
        A: "安心できる習慣をひとつ決め、毎日やさしく続けてみましょう。",
        B: "言葉で方向を整える時間を毎日1分だけ作ってみましょう。",
        C: "感じたことを外へ届ける行動を1日1回入れてみましょう。",
        D: "不要なものを一つ手放す行動を7日続けてみましょう。",
        E: "感謝と受け取りを記録する習慣を毎日重ねてみましょう。"
      };
      return suggestions[shuku] || fallback[typeKey] || "毎日ひとつ、感謝を書いて今の流れを整えてみましょう。";
    }

    function shukuCurrentLine(shuku, stateKey, typeKey) {
      var stateMap = {
        anxiety: {
          A: "いまは心を守りながら整える段階です。受け止める力が、次の安心を育てています。",
          B: "迷いは方向を見直す合図です。あなたの導きの力は、静かに働き続けています。",
          C: "言葉にできない揺れがあっても大丈夫です。表現の力が整理を助けてくれます。",
          D: "揺らぎは変容の前触れです。古い流れを終え、新しい巡りに入る準備が進んでいます。",
          E: "不安の中でも整えを続けられる強さがあります。土台は着実に育っています。"
        },
        gratitude: {
          A: "受け取る力が深まり、心の安心が育っています。やさしい巡りが始まっています。",
          B: "感謝があなたの言葉に灯りをともしています。周囲への導きも自然に強まっています。",
          C: "感謝を表現できている今、あなたの魅力は現実をやわらかく動かしています。",
          D: "手放しと感謝が同時に進み、流れの切り替えがとても上手にできています。",
          E: "感謝の循環が豊かさを呼び込む段階です。受け取る器がしっかり開いています。"
        },
        future: {
          A: "未来への願いを安心の土台で育てられています。焦らない歩みが力になります。",
          B: "未来の方向が少しずつ明確になっています。導きの光を信じて進める時期です。",
          C: "未来を描く力が高まっています。表現した言葉が次の現実をつくり始めています。",
          D: "未来へ向かうための切り替えが進んでいます。不要な荷物を軽くして前に進めます。",
          E: "未来の実りを育てる流れに入っています。小さな行動が大きな循環につながります。"
        },
        neutral: {
          A: "整えが進み、受け取る力が安定しています。あなたらしい安心の流れが育っています。",
          B: "整えが進み、導きの視点が澄んでいます。次の選択を落ち着いて選べる状態です。",
          C: "整えが進み、表現の力が整っています。心の声を外へ届ける準備ができています。",
          D: "整えが進み、変容の力が静かに育っています。新しい流れへ移る準備が整っています。",
          E: "整えが進み、豊かさの循環が安定しています。日々の積み重ねが実りを育てています。"
        }
      };
      var byState = stateMap[stateKey] || stateMap.neutral;
      return byState[typeKey] || "整えが進み、内側の声を受け取る力が育っています。";
    }

    function resolveBaseProfile() {
      var pid = params.get("participantId") || params.get("pid") || "";
      var participantData = (pid && window.PARTICIPANTS_DATA && window.PARTICIPANTS_DATA[pid]) ? window.PARTICIPANTS_DATA[pid] : {};
      var name = params.get("name") || participantData.name || "あなた";
      var email = params.get("email") || participantData.email || "";
      var birth = params.get("birth") || participantData.birth || "";
      var zodiac = normalizeZodiac(params.get("zodiac") || "");
      var shuku = (params.get("shuku") || params.get("honmei") || params.get("honmeiShuku") || participantData.shuku || "").replace(/\s/g, "");
      var concern = params.get("concern") || participantData.concern || "";
      var q = params.get("q") || participantData.q || "";
      var q2 = params.get("q2") || participantData.q2 || "";
      var newmoon = params.get("newmoon") || participantData.newmoonWish || participantData.newmoon || participantData.wish || "";
      if (!zodiac && birth) zodiac = zodiacFromBirth(birth);
      try {
        var snap = JSON.parse(localStorage.getItem(day2SnapshotKey) || "{}");
        if (!zodiac) zodiac = normalizeZodiac(snap.zodiac || "");
        if (!shuku) shuku = (snap.shuku || "").replace(/\s/g, "");
      } catch (e) {}
      if (!newmoon) newmoon = readIntroWish(pid || email || birth || name);
      return {
        participantId: pid,
        email: email,
        name: name,
        birth: birth,
        zodiac: zodiac,
        shuku: shuku,
        concern: concern,
        q: q,
        q2: q2,
        newmoon: newmoon
      };
    }

    var DAY_THEMES = {
      "1": "いまの心にやさしく気づく",
      "2": "私の土台の資質を知る",
      "3": "受け取っている豊かさに気づく",
      "4": "不要になった思いを軽くする",
      "5": "小さな習慣で流れを整える",
      "6": "未来の私と今の私をつなぐ",
      "7": "私の開運設計図を完成させる"
    };

    function applyDiaryMessages(hasDiary) {
      var openingMsg = root.querySelector("[data-diary-opening-msg]");
      if (openingMsg) {
        if (hasDiary) {
          openingMsg.textContent = "あなたが残した写真や言葉には、今の心が選んだ大切なしるしが映っています。";
        } else {
          openingMsg.innerHTML = "今回は、写真や言葉として残されたしるしはありませんでした。<br>けれど、月の物語はここで終わりではありません。<br>今日から残す小さな一枚やひと言が、次の鑑定書をあなただけの物語へ育てていきます。";
        }
      }
      if (!hasDiary) {
        var cardMsgs = {
          photo:  "これから心が動いた景色を一枚残してみましょう",
          words:  "今日、心に浮かんだ言葉が最初のしるしになります",
          thanks: "小さな「ありがとう」が月の流れを整えます",
          next:   "今できる小さな一歩から始めて大丈夫です"
        };
        ["photo","words","thanks","next"].forEach(function(k) {
          var el = root.querySelector("[data-diary-card='" + k + "']");
          if (el) el.textContent = cardMsgs[k];
        });
        var cta = root.querySelector("[data-no-diary-cta]");
        if (cta) cta.style.display = "";
      }
    }

    function readStructuredDiary(identity) {
      var result = {};
      for (var d = 1; d <= 7; d++) {
        var key = "tsukiyomi:structuredDiary:v1:" + identity + ":day:" + d;
        try {
          var raw = localStorage.getItem(key);
          if (!raw) continue;
          var rec = JSON.parse(raw);
          if (!rec || !rec.lines) continue;
          var lines = rec.lines.filter(function(l){ return (l.text || "").trim().length > 0; });
          if (lines.length) result[String(d)] = lines;
        } catch(e) {}
      }
      return result;
    }

    function findStructuredDiaryIdentity() {
      var prefix = "tsukiyomi:structuredDiary:v1:";
      var scores = {};
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i) || "";
        if (key.indexOf(prefix) !== 0) continue;
        var match = key.match(/^tsukiyomi:structuredDiary:v1:(.+):day:([1-7])$/);
        if (!match) continue;
        var identity = match[1];
        var day = match[2];
        try {
          var rec = JSON.parse(localStorage.getItem(key) || "{}");
          var hasLines = rec && Array.isArray(rec.lines) && rec.lines.some(function(l){ return (l.text || "").trim(); });
          if (!hasLines && !(rec && (rec.photoDataUrl || rec.hasPhoto || rec.photoName))) continue;
          if (!scores[identity]) scores[identity] = { identity: identity, score: 0 };
          scores[identity].score += day === "7" ? 10 : 1;
          if (rec.savedAtJst) scores[identity].savedAtJst = rec.savedAtJst;
        } catch (e) {}
      }
      return Object.keys(scores).map(function(key){ return scores[key]; }).sort(function(a, b){
        if (b.score !== a.score) return b.score - a.score;
        return String(b.savedAtJst || "").localeCompare(String(a.savedAtJst || ""));
      })[0]?.identity || "";
    }

    function readStructuredProfile(identity) {
      if (!identity) return {};
      for (var d = 1; d <= 7; d++) {
        var key = "tsukiyomi:structuredDiary:v1:" + identity + ":day:" + d;
        try {
          var rec = JSON.parse(localStorage.getItem(key) || "{}");
          if (rec && rec.profile) return rec.profile;
        } catch (e) {}
      }
      return {};
    }

    function buildDiarySummaryHtml(diaryMap, startDay, endDay) {
      startDay = startDay || 1;
      endDay = endDay || 7;
      var html = "";
      for (var d = startDay; d <= endDay; d++) {
        var ds = String(d);
        var theme = DAY_THEMES[ds] || "";
        var lines = diaryMap[ds];
        html += '<div style="margin-bottom:20px;">';
        html += '<p style="font-size:13px;color:#9a8070;margin:0 0 4px;font-weight:bold;">Day' + d + '　' + theme + '</p>';
        if (lines && lines.length) {
          lines.forEach(function(l) {
            var text = (l.text || "").trim();
            if (!text) return;
            var label = (l.placeholder || "").replace(/[（）()「」]/g, "").trim();
            html += '<p style="font-size:14px;color:#3a2a1a;margin:0 0 4px;line-height:1.7;">';
            if (label) html += '<span style="font-size:12px;color:#b0957a;">▶ ' + label + '</span><br>';
            html += text + '</p>';
          });
        } else {
          html += '<p style="font-size:13px;color:#bbb;margin:0;">（記録なし）</p>';
        }
        html += '</div>';
      }
      return html;
    }

    function buildComprehensiveReading(diaryMap, name, shuku, typeKey) {
      var allTexts = [];
      var dayTexts = {};
      for (var d = 1; d <= 7; d++) {
        var ds = String(d);
        var lines = diaryMap[ds] || [];
        var dayText = lines.map(function(l){ return (l.text || "").trim(); }).filter(Boolean).join("　");
        if (dayText) {
          allTexts.push(dayText);
          dayTexts[ds] = dayText;
        }
      }
      var merged = allTexts.join("\n");

      // 目標設定（Day6・Day7から抽出）
      var goalText = (dayTexts["6"] || "") + " " + (dayTexts["7"] || "");
      var hasGoal = goalText.trim().length > 0;

      // ギャップ・手放し（Day4から抽出）
      var releaseText = dayTexts["4"] || "";
      var hasRelease = releaseText.trim().length > 0;

      // 感謝・豊かさ（Day3から抽出）
      var abundanceText = dayTexts["3"] || "";

      // 現在地（総合鑑定文）
      var moodState = "neutral";
      if (merged.indexOf("不安") !== -1 || merged.indexOf("迷") !== -1) moodState = "anxiety";
      else if (merged.indexOf("感謝") !== -1 || merged.indexOf("ありがとう") !== -1) moodState = "gratitude";
      else if (merged.indexOf("願") !== -1 || merged.indexOf("未来") !== -1) moodState = "future";

      var currentBase = shukuCurrentLine(shuku, moodState, typeKey);

      var goalSentence = "";
      if (hasGoal) {
        goalSentence = "\n\nDay6・Day7の言葉から、あなたが向かいたい方向が見えています。「" + goalText.slice(0, 40) + "…」という言葉が、あなたの目標を示しています。";
      }
      var releaseSentence = "";
      if (hasRelease) {
        releaseSentence = "\n\nDay4で手放したいと書いた「" + releaseText.slice(0, 30) + "…」は、今もあなたの中にある課題です。ここを丁寧に軽くしていくことが、目標へ近づく整えになります。";
      }

      return currentBase + goalSentence + releaseSentence;
    }

    var profile = resolveBaseProfile();
    var explicitStructuredIdentity = profile.birth || profile.email || profile.participantId || (profile.name && profile.name !== "あなた" ? profile.name : "");
    var detectedStructuredIdentity = "";
    if (!explicitStructuredIdentity || !readStructuredDiary(explicitStructuredIdentity).length) {
      detectedStructuredIdentity = findStructuredDiaryIdentity();
    }
    if (detectedStructuredIdentity) {
      var detectedProfile = readStructuredProfile(detectedStructuredIdentity);
      profile.participantId = profile.participantId || detectedProfile.participantId || detectedStructuredIdentity;
      profile.email = profile.email || detectedProfile.email || "";
      profile.name = profile.name !== "あなた" ? profile.name : (detectedProfile.name || "あなた");
      profile.birth = profile.birth || detectedProfile.birth || "";
      profile.zodiac = profile.zodiac || normalizeZodiac(detectedProfile.zodiac || "");
      profile.shuku = profile.shuku || String(detectedProfile.shuku || "").replace(/\s/g, "");
      profile.concern = profile.concern || detectedProfile.concern || "";
      profile.q = profile.q || detectedProfile.q || "";
      profile.q2 = profile.q2 || detectedProfile.q2 || "";
      profile.newmoon = profile.newmoon || detectedProfile.newmoon || detectedProfile.wish || readIntroWish(detectedStructuredIdentity);
    }

    renderFirstConcern(root, profile);

    // @@Q@@...@@/Q@@ マーカーを日記引用ブロックに変換してinnerHTML描画
    function renderDeepSection(el, rawText) {
      if (!el || !rawText) return;
      var sourceText = String(rawText);

      // 第一章の長文は段落単位で2ページへ分け、本文サイズを維持する
      if (el.hasAttribute('data-deep-current')) {
        var continuationSection = root.querySelector('[data-deep-current-continuation]');
        var continuationText = root.querySelector('[data-deep-current-cont]');
        var paragraphs = sourceText.split(/\n\s*\n/).filter(function(part) { return part.trim(); });
        if (paragraphs.length > 1 && sourceText.length > 430 && continuationSection && continuationText) {
          var runningLength = 0;
          var splitIndex = 1;
          for (var pi = 0; pi < paragraphs.length - 1; pi++) {
            runningLength += paragraphs[pi].length;
            splitIndex = pi + 1;
            if (runningLength >= sourceText.length * 0.52) break;
          }
          sourceText = paragraphs.slice(0, splitIndex).join('\n\n');
          continuationSection.style.display = '';
          renderDeepSection(continuationText, paragraphs.slice(splitIndex).join('\n\n'));
        } else if (continuationSection) {
          continuationSection.style.display = 'none';
        }
      }

      var html = sourceText
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/@@KW@@([\s\S]*?)@@\/KW@@/g, function(_, inner) {
          return '<span class="deep-kw-block"><span class="deep-kw-label">✦ 7日間のキーワード</span><span class="deep-kw-words">' + inner + '</span></span>';
        })
        .replace(/@@Q@@([\s\S]*?)@@\/Q@@/g, function(_, inner) {
          return '<span class="deep-diary-voice"><span class="deep-diary-voice-label">✦ あなたの言葉より</span>' + inner + '</span>';
        })
        .replace(/\n/g, '<br>');
      el.innerHTML = html;
    }

    function renderVoicesPanels(report, hasData) {
      var voicesSection = root.querySelector("[data-deep-voices-section]");
      var voicesSectionCont = root.querySelector("[data-deep-voices-section-cont]");
      var voicesContainer = root.querySelector("[data-deep-voices]");
      var voicesContainerCont = root.querySelector("[data-deep-voices-cont]");
      if (voicesContainer) {
        if (report && report.voicesHtml) {
          voicesContainer.innerHTML = report.voicesHtml;
        } else if (hasData) {
          voicesContainer.innerHTML = '<p class="deep-guidance-text">月読み日記に残された本人の言葉を読み込んでいます。</p>';
        } else {
          voicesContainer.innerHTML = '<p class="deep-guidance-text">まだ日記の記録がありません。7日間の日記が書かれると、ここに本人の言葉が表示されます。</p>';
        }
      }
      if (voicesContainerCont) {
        if (report && report.voicesHtmlCont) {
          voicesContainerCont.innerHTML = report.voicesHtmlCont;
        } else if (hasData) {
          voicesContainerCont.innerHTML = '<p class="deep-guidance-text">続きの本人の言葉を読み込んでいます。</p>';
        }
      }
      if (voicesSection) voicesSection.style.display = "";
      if (voicesSectionCont) voicesSectionCont.style.display = (report && report.voicesHtmlCont) ? "" : "none";
    }

    // GASから取得した日記データの中の月フェーズ行をlocalStorage + DOM に復元
    function restoreMoonPhaseFromGas(days, identity) {
      var MOON_PREFIX = "tsukiyomi:moonPhase:v1:";
      var phMap = { "moon-phase-new": "new", "moon-phase-first": "first", "moon-phase-full": "full", "moon-phase-last": "last" };
      for (var dayNum in days) {
        var lines = (days[dayNum] && days[dayNum].lines) || [];
        lines.forEach(function(line) {
          var ph = line.placeholder || "";
          var text = (line.text || "").trim();
          if (!text) return;
          if (phMap[ph]) {
            var lsKey = MOON_PREFIX + identity + ":" + phMap[ph];
            var lsVal = localStorage.getItem(lsKey);
            if (!lsVal) {
              // localStorageにデータなし → GASデータを保存＆profile fallbackを上書き
              localStorage.setItem(lsKey, text);
              var el = document.getElementById("moon-phase-" + phMap[ph]);
              if (el) el.value = text;
            }
          }
          if (ph === "moon-fullmoon-gemini") {
            if (!localStorage.getItem("moon-fullmoon-gemini")) localStorage.setItem("moon-fullmoon-gemini", text);
            var gEl = document.getElementById("moon-fullmoon-gemini");
            if (gEl && !gEl.value) gEl.value = text;
          }
        });
      }
    }

    // チェック・編集ツール（kanon_deep_report_editor.html）で保存した内容があれば優先表示
    var pid = params.get("participantId") || params.get("pid") || "";
    var override = getDeepReportOverride(pid);
      if (override) {
      var ov = override;
      if (current && ov.s1) renderDeepSection(current, ov.s1);
      if (themes && ov.s2) renderDeepSection(themes, ov.s2);
      if (shukuView && ov.s3) renderDeepSection(shukuView, ov.s3);
      if (next && ov.s4) renderDeepSection(next, ov.s4);
      var kanonView = root.querySelector("[data-deep-kanon]");
      if (kanonView && ov.kanon) {
        kanonView.textContent = ov.kanon;
        var kanonPanel = kanonView.closest(".completion-panel");
        if (kanonPanel) kanonPanel.style.display = "";
      }
      // オーバーライドモードでも日記サマリーを表示する
      var ovIdentity = detectedStructuredIdentity || explicitStructuredIdentity || params.get("participantId") || params.get("pid") || profile.participantId || profile.name || "guest";
      var ovDiaryMap = readStructuredDiary(ovIdentity);
      var ovHasDiary = Object.keys(ovDiaryMap).length > 0;
      var ovSummarySection = root.querySelector("[data-deep-diary-summary]");
      var ovSummarySectionCont = root.querySelector("[data-deep-diary-summary-cont]");
      var ovSummaryDays = root.querySelector("[data-deep-diary-days]");
      if (ovSummaryDays) {
        ovSummaryDays.innerHTML = buildDiarySummaryHtml(ovDiaryMap, 1, 7);
      }
      if (ovSummarySection) ovSummarySection.style.display = "";
      if (ovSummarySectionCont) ovSummarySectionCont.style.display = "none";
      renderVoicesPanels(ov, ovHasDiary);
      applyDiaryMessages(ovHasDiary);
      // ローカルに日記データがない場合はサーバーから補完する（overrideパス）
      if (!ovHasDiary) {
        var ovSyncConfig = (function(){
          var u = localStorage.getItem("tsukiyomi:sheetSync:url") || "https://script.google.com/macros/s/AKfycbxWpo3QzBNxemQNtYqYZfuMhjyrr2prjY6lsZPUZP5soKjimHzMts_Phz8D73DUYvbs/exec";
          var s = localStorage.getItem("tsukiyomi:sheetSync:secretKey") || "tsukiyomi-2026-key";
          return { url: u, secretKey: s };
        })();
        var ovSyncCached = {};
        try { ovSyncCached = JSON.parse(localStorage.getItem("tsukiyomi:diarySync:cachedProfile") || "{}"); } catch(e) {}
        var ovFetchPid   = pid || profile.participantId || (ovIdentity && ovIdentity !== "guest" ? ovIdentity : "") || ovSyncCached.participantId || "";
        var ovFetchEmail = profile.email || ovSyncCached.email || "";
        var ovFetchParts = [];
        if (ovFetchPid)   ovFetchParts.push("pid="   + encodeURIComponent(ovFetchPid));
        if (ovFetchEmail) ovFetchParts.push("email=" + encodeURIComponent(ovFetchEmail));
        if (ovFetchParts.length > 0) {
          var ovFetchUrl = ovSyncConfig.url + "?" + ovFetchParts.join("&") + "&secretKey=" + encodeURIComponent(ovSyncConfig.secretKey) + "&t=" + Date.now();
          fetch(ovFetchUrl, { redirect: "follow" })
            .then(function(r){ return r.json(); })
            .then(function(result){
              if (result && result.ok && result.days && Object.keys(result.days).length > 0) {
                var fetchedOvDiary = {};
                for (var dayNum in result.days) {
                  var dayData = result.days[dayNum];
                  localStorage.setItem("tsukiyomi:structuredDiary:v1:" + ovFetchPid + ":day:" + dayNum, JSON.stringify(dayData));
                  if (dayData.lines) {
                    var filled = dayData.lines.filter(function(l){ return (l.text || "").trim().length > 0; });
                    if (filled.length) fetchedOvDiary[dayNum] = filled;
                  }
                }
                restoreMoonPhaseFromGas(result.days, ovFetchPid);
                // "moon"キーは月フェーズ用なので除外して日記日数(1-7)のみ確認
                var hasDiaryDaysOv = false;
                for (var dKeyOv in fetchedOvDiary) { if (/^[1-7]$/.test(dKeyOv)) { hasDiaryDaysOv = true; break; } }
                if (hasDiaryDaysOv) {
                  if (ovSummaryDays) ovSummaryDays.innerHTML = buildDiarySummaryHtml(fetchedOvDiary, 1, 7);
                  if (ovSummarySection) ovSummarySection.style.display = "";
                  var genRep = window.TsukiyomiReportGen ? window.TsukiyomiReportGen.generate(profile) : null;
                  renderVoicesPanels(genRep || ov, true);
                  applyDiaryMessages(true);
                }
              }
            })
            .catch(function(){});
        }
      }
      return;
    }

    // 自動生成レポートがあれば表示（Day7保存時に生成済みのものを含む）
    if (window.TsukiyomiReportGen) {
      var autoIdentity = detectedStructuredIdentity || explicitStructuredIdentity || pid || profile.participantId || profile.name || "guest";
      // 日記が birth date 等の別キーに保存されている場合、pid キーにも複製してから generate する
      var autoPidKey = profile.participantId || pid;
      if (autoIdentity && autoPidKey && autoIdentity !== autoPidKey) {
        for (var _aday = 1; _aday <= 7; _aday++) {
          var _asrcKey = "tsukiyomi:structuredDiary:v1:" + autoIdentity + ":day:" + _aday;
          var _adstKey = "tsukiyomi:structuredDiary:v1:" + autoPidKey + ":day:" + _aday;
          var _araw = localStorage.getItem(_asrcKey);
          if (_araw && !localStorage.getItem(_adstKey)) localStorage.setItem(_adstKey, _araw);
        }
      }
      var autoReport = TsukiyomiReportGen.load(autoIdentity) || TsukiyomiReportGen.load(autoPidKey) || TsukiyomiReportGen.triggerIfReady(profile);
      // 宿データなしで生成されたキャッシュを無効化して再生成
      if (autoReport && profile.shuku && autoReport.s3 && autoReport.s3.indexOf('宿曜情報がありません') >= 0) {
        autoReport = TsukiyomiReportGen.generate(profile);
      }
      // 名前なしで生成されたキャッシュも再生成（「あなた」で始まる場合）
      if (autoReport && profile.name && profile.name !== 'あなた' && autoReport.s3 && autoReport.s3.indexOf('あなた') === 0) {
        autoReport = TsukiyomiReportGen.generate(profile);
      }
      // 旧キャッシュで日記の続きが空のままなら、最新ロジックで再生成する
      if (autoReport && (!autoReport.voicesHtml || !autoReport.voicesHtmlCont)) {
        autoReport = TsukiyomiReportGen.generate(profile);
      }
      if (autoReport && !autoReport.templateHtml) {
        autoReport = TsukiyomiReportGen.generate(profile);
      }
      if (autoReport && autoReport.s1) {
        if (current) renderDeepSection(current, autoReport.s1);
        if (themes) renderDeepSection(themes, autoReport.s2);
        if (shukuView) renderDeepSection(shukuView, autoReport.s3);
        if (next) renderDeepSection(next, autoReport.s4);
        var autoTemplateSection = root.querySelector("[data-deep-template-section]");
        var autoTemplateContainer = root.querySelector("[data-deep-template]");
        if (autoTemplateContainer && autoReport.templateHtml) {
          autoTemplateContainer.innerHTML = autoReport.templateHtml;
          if (autoTemplateSection) autoTemplateSection.style.display = "";
        }
        renderVoicesPanels(autoReport, true);
        // 日記サマリーをautoReportパスでも必ず表示する
        var autoDiaryMap = readStructuredDiary(autoIdentity);
        var autoSummarySection = root.querySelector("[data-deep-diary-summary]");
        var autoSummaryDays = root.querySelector("[data-deep-diary-days]");
        if (autoSummaryDays) {
          autoSummaryDays.innerHTML = buildDiarySummaryHtml(autoDiaryMap, 1, 7);
        }
        if (autoSummarySection) autoSummarySection.style.display = "";
        applyDiaryMessages(Object.keys(autoDiaryMap).length > 0);
        // ローカルにデータがない場合はサーバーから補完する
        if (Object.keys(autoDiaryMap).length === 0) {
          var autoSyncConfig = (function(){
            var u = localStorage.getItem("tsukiyomi:sheetSync:url") || "https://script.google.com/macros/s/AKfycbxWpo3QzBNxemQNtYqYZfuMhjyrr2prjY6lsZPUZP5soKjimHzMts_Phz8D73DUYvbs/exec";
            var s = localStorage.getItem("tsukiyomi:sheetSync:secretKey") || "tsukiyomi-2026-key";
            return { url: u, secretKey: s };
          })();
          // diary_data_sync.js が保存するキャッシュからも補完（URLパラメータなしでも email が取れる）
          var syncCached = {};
          try { syncCached = JSON.parse(localStorage.getItem("tsukiyomi:diarySync:cachedProfile") || "{}"); } catch(e) {}
          var fetchPid   = profile.participantId || pid || syncCached.participantId || "";
          var fetchEmail = profile.email || syncCached.email || "";
          var autoFetchParts = [];
          if (fetchPid)   autoFetchParts.push("pid="   + encodeURIComponent(fetchPid));
          if (fetchEmail) autoFetchParts.push("email=" + encodeURIComponent(fetchEmail));
          if (autoFetchParts.length > 0) {
            var fetchIdentity = fetchPid || fetchEmail || autoIdentity;
            var autoFetchUrl = autoSyncConfig.url + "?" + autoFetchParts.join("&") + "&secretKey=" + encodeURIComponent(autoSyncConfig.secretKey) + "&t=" + Date.now();
            fetch(autoFetchUrl, { redirect: "follow" })
              .then(function(r){ return r.json(); })
              .then(function(result){
                if (result && result.ok && result.days && Object.keys(result.days).length > 0) {
                  var fetchedDiary = {};
                  for (var dayNum in result.days) {
                    var dayData = result.days[dayNum];
                    localStorage.setItem("tsukiyomi:structuredDiary:v1:" + fetchIdentity + ":day:" + dayNum, JSON.stringify(dayData));
                    if (dayData.lines) {
                      var filled = dayData.lines.filter(function(l){ return (l.text || "").trim().length > 0; });
                      if (filled.length) fetchedDiary[dayNum] = filled;
                    }
                  }
                  restoreMoonPhaseFromGas(result.days, fetchIdentity);
                  if (autoSummaryDays) autoSummaryDays.innerHTML = buildDiarySummaryHtml(fetchedDiary, 1, 7);
                  if (autoSummarySection) autoSummarySection.style.display = "";
                  // "moon"キーは月フェーズ用なので除外して日記日数(1-7)のみ確認
                  var hasDiaryDays = false;
                  for (var dKey in fetchedDiary) { if (/^[1-7]$/.test(dKey)) { hasDiaryDays = true; break; } }
                  if (hasDiaryDays) {
                    var fetchedAutoReport = window.TsukiyomiReportGen ? window.TsukiyomiReportGen.generate(profile) : null;
                    if (fetchedAutoReport) {
                      renderVoicesPanels(fetchedAutoReport, true);
                      applyDiaryMessages(true);
                    }
                  }
                }
              })
              .catch(function(){});
          }
        }
        return;
      }
    }

    var typeKey = shukuTypeKey(profile.shuku);
    if (shukuView) {
      if (profile.shuku) {
        var head = profile.name + "さんの本命宿は「" + profile.shuku + "」です。";
        if (profile.zodiac) head += " " + profile.zodiac + "の流れと重ねて、今を整えていきましょう。";
        var typePart = shukuTypeLabel(typeKey);
        if (typePart) head += " この宿は「" + typePart + "」。";
        var deepLine = shukuDeepLine(profile.shuku);
        shukuView.textContent = head + " " + (deepLine || shukuGuidance(typeKey));
      } else {
        shukuView.textContent = "本命宿がまだ読み取れていません。ムーンゲートから入り直すか、Day2の宿曜アイテム選択を保存すると表示されます。";
      }
    }

    // 構造化日記データを優先的に読み込む
    var structuredIdentity = detectedStructuredIdentity || explicitStructuredIdentity || pid || profile.participantId || profile.name || "guest";
    var diaryMap = readStructuredDiary(structuredIdentity);
    var hasStructured = Object.keys(diaryMap).length > 0;

    function renderDeepReport(diaryMapToUse) {
      var hasData = Object.keys(diaryMapToUse).some(function(k){ return /^[1-7]$/.test(k); });
      var templateSection = root.querySelector("[data-deep-template-section]");
      var templateContainer = root.querySelector("[data-deep-template]");

      // Day-by-day サマリー表示（Day1-7を1パネルに統合）
      var summarySection = root.querySelector("[data-deep-diary-summary]");
      var summarySectionCont = root.querySelector("[data-deep-diary-summary-cont]");
      var summaryDays = root.querySelector("[data-deep-diary-days]");
      if (summaryDays) {
        summaryDays.innerHTML = buildDiarySummaryHtml(diaryMapToUse, 1, 7);
        if (summarySection) summarySection.style.display = "";
      }
      if (summarySectionCont) summarySectionCont.style.display = "none";

      if (templateContainer) {
        templateContainer.innerHTML = '<p class="deep-guidance-text">新月の願いと7日間の記録がそろうと、ここに分析テンプレートが表示されます。</p>';
        if (templateSection) templateSection.style.display = "";
      }

      var voicesContainer = root.querySelector("[data-deep-voices]");
      if (window.TsukiyomiReportGen && voicesContainer) {
        var generatedReport = TsukiyomiReportGen.generate(profile);
        renderVoicesPanels(generatedReport, hasData);
      }

      // 旧フォーマットとのフォールバック
      var legacyTexts = [];
      for (var d = 1; d <= 7; d++) {
        var t = (localStorage.getItem(storageKey(String(d))) || "").trim();
        if (t) legacyTexts.push(t);
      }

      if (!hasData && !legacyTexts.length) {
        if (current) current.textContent = "まだ7日間の記録が見つかりませんでした。日記を書いてから再度開いてください。";
        if (themes) themes.textContent = "記録が増えると、ここに今のテーマが表示されます。";
        if (next) next.textContent = "まずは今日の一行から始めれば十分です。";
        return;
      }

      // 総合鑑定（目標設定・ギャップ調整）
      if (hasData) {
        var comprehensiveText = buildComprehensiveReading(diaryMapToUse, profile.name, profile.shuku, typeKey);
        if (current) current.textContent = comprehensiveText;
      } else {
        var mergedLegacy = legacyTexts.join("\n");
        var moodLegacy = "neutral";
        if (mergedLegacy.indexOf("不安") !== -1 || mergedLegacy.indexOf("迷") !== -1) moodLegacy = "anxiety";
        else if (mergedLegacy.indexOf("感謝") !== -1 || mergedLegacy.indexOf("ありがとう") !== -1) moodLegacy = "gratitude";
        else if (mergedLegacy.indexOf("願") !== -1 || mergedLegacy.indexOf("未来") !== -1) moodLegacy = "future";
        if (current) current.textContent = shukuCurrentLine(profile.shuku, moodLegacy, typeKey);
      }

      // テーマ抽出
      var allMerged = hasData
        ? Object.values(diaryMapToUse).map(function(lines){ return lines.map(function(l){ return l.text || ""; }).join("　"); }).join("\n")
        : legacyTexts.join("\n");

      var tags = [];
      if (allMerged.indexOf("感謝") !== -1 || allMerged.indexOf("ありがとう") !== -1) tags.push("感謝の循環");
      if (allMerged.indexOf("本音") !== -1 || allMerged.indexOf("気づ") !== -1) tags.push("本音への気づき");
      if (allMerged.indexOf("願") !== -1 || allMerged.indexOf("未来") !== -1) tags.push("未来への意志");
      if (allMerged.indexOf("整え") !== -1 || allMerged.indexOf("習慣") !== -1) tags.push("整える習慣");
      if (allMerged.indexOf("手放") !== -1 || allMerged.indexOf("軽く") !== -1) tags.push("手放しと再生");
      if (!tags.length) tags.push("自己理解の深化");
      if (themes) themes.textContent = tags.join(" / ");

      if (next) {
        var nextBase = "次の7日間は「" + tags[0] + "」をテーマに整えていきましょう。";
        var nextShuku = shukuNextSevenSuggestion(profile.shuku, typeKey);
        next.textContent = nextBase + " " + nextShuku + " 小さな積み重ねが、運気の巡りを安定させます。";
      }
    }

    // localStorageにデータがあればそのまま描画
    if (hasStructured) {
      // generate(profile) は profile.participantId(pid) キーで読むため、
      // structuredIdentity が pid と異なる場合(birth日付等)はpidキーにコピー
      var pidKey = profile.participantId || pid;
      if (pidKey && pidKey !== structuredIdentity) {
        for (var _d = 1; _d <= 7; _d++) {
          var _src = "tsukiyomi:structuredDiary:v1:" + structuredIdentity + ":day:" + _d;
          var _dst = "tsukiyomi:structuredDiary:v1:" + pidKey + ":day:" + _d;
          var _raw = localStorage.getItem(_src);
          if (_raw && !localStorage.getItem(_dst)) localStorage.setItem(_dst, _raw);
        }
      }
      renderDeepReport(diaryMap);
      applyDiaryMessages(true);
      return;
    }
    // 日記データなし
    applyDiaryMessages(false);

    // localStorageにデータがなければスプレッドシートから取得
    if (structuredIdentity && structuredIdentity !== "guest") {
      if (current) current.textContent = "日記データを読み込んでいます…";
      var syncConfig = (function(){
        var u = localStorage.getItem("tsukiyomi:sheetSync:url") || "https://script.google.com/macros/s/AKfycbxWpo3QzBNxemQNtYqYZfuMhjyrr2prjY6lsZPUZP5soKjimHzMts_Phz8D73DUYvbs/exec";
        var s = localStorage.getItem("tsukiyomi:sheetSync:secretKey") || "tsukiyomi-2026-key";
        return { url: u, secretKey: s };
      })();
      var fetchParts = [];
      if (profile.participantId || pid) fetchParts.push("pid=" + encodeURIComponent(profile.participantId || pid));
      if (profile.email) fetchParts.push("email=" + encodeURIComponent(profile.email));
      if (!fetchParts.length) fetchParts.push("pid=" + encodeURIComponent(structuredIdentity));
      var fetchUrl = syncConfig.url + "?" + fetchParts.join("&") + "&secretKey=" + encodeURIComponent(syncConfig.secretKey) + "&t=" + Date.now();
      fetch(fetchUrl, { redirect: "follow" })
        .then(function(r){ return r.json(); })
        .then(function(result){
          if (result && result.ok && result.days && Object.keys(result.days).length > 0) {
            var restored = {};
            var oldSaveId = profile.participantId || pid || structuredIdentity;
            for (var dayNum in result.days) {
              var dayData = result.days[dayNum];
              var key = "tsukiyomi:structuredDiary:v1:" + oldSaveId + ":day:" + dayNum;
              localStorage.setItem(key, JSON.stringify(dayData));
              if (dayData.lines) {
                var filled = dayData.lines.filter(function(l){ return (l.text || "").trim().length > 0; });
                if (filled.length) restored[dayNum] = filled;
              }
            }
            restoreMoonPhaseFromGas(result.days, oldSaveId);
            renderDeepReport(restored);
            applyDiaryMessages(true);
            if (window.TsukiyomiReportGen) {
              var hasDiaryDaysOld = false;
              for (var dKeyOld in restored) { if (/^[1-7]$/.test(dKeyOld)) { hasDiaryDaysOld = true; break; } }
              if (hasDiaryDaysOld) {
                var fetchedReport = TsukiyomiReportGen.generate(profile);
                if (fetchedReport && fetchedReport.s1) {
                  if (current) renderDeepSection(current, fetchedReport.s1);
                  if (themes) renderDeepSection(themes, fetchedReport.s2);
                  if (shukuView) renderDeepSection(shukuView, fetchedReport.s3);
                  if (next) renderDeepSection(next, fetchedReport.s4);
                  var fetchedTemplateSection = root.querySelector("[data-deep-template-section]");
                  var fetchedTemplateContainer = root.querySelector("[data-deep-template]");
                  if (fetchedTemplateContainer && fetchedReport.templateHtml) {
                    fetchedTemplateContainer.innerHTML = fetchedReport.templateHtml;
                    if (fetchedTemplateSection) fetchedTemplateSection.style.display = "";
                  }
                  renderVoicesPanels(fetchedReport, true);
                }
              }
            }
          } else {
            // GASが空のとき、localStorageに日記があればそちらを使う
            var fallbackMap = readStructuredDiary(profile.participantId || pid || structuredIdentity);
            renderDeepReport(Object.keys(fallbackMap).length > 0 ? fallbackMap : {});
          }
        })
        .catch(function(){
          var fallbackMap = readStructuredDiary(profile.participantId || pid || structuredIdentity);
          renderDeepReport(Object.keys(fallbackMap).length > 0 ? fallbackMap : {});
        });
      return;
    }

    renderDeepReport({});
    return;

    // 総合鑑定（目標設定・ギャップ調整）
    if (hasStructured) {
      var comprehensiveText = buildComprehensiveReading(diaryMap, profile.name, profile.shuku, typeKey);
      if (current) current.textContent = comprehensiveText;
    } else {
      var merged = texts.join("\n");
      var moodState = "neutral";
      if (merged.indexOf("不安") !== -1 || merged.indexOf("迷") !== -1) moodState = "anxiety";
      else if (merged.indexOf("感謝") !== -1 || merged.indexOf("ありがとう") !== -1) moodState = "gratitude";
      else if (merged.indexOf("願") !== -1 || merged.indexOf("未来") !== -1) moodState = "future";
      if (current) current.textContent = shukuCurrentLine(profile.shuku, moodState, typeKey);
    }

    // テーマ抽出
    var allMerged = hasStructured
      ? Object.values(diaryMap).map(function(lines){ return lines.map(function(l){ return l.text || ""; }).join("　"); }).join("\n")
      : texts.join("\n");

    var tags = [];
    if (allMerged.indexOf("感謝") !== -1 || allMerged.indexOf("ありがとう") !== -1) tags.push("感謝の循環");
    if (allMerged.indexOf("本音") !== -1 || allMerged.indexOf("気づ") !== -1) tags.push("本音への気づき");
    if (allMerged.indexOf("願") !== -1 || allMerged.indexOf("未来") !== -1) tags.push("未来への意志");
    if (allMerged.indexOf("整え") !== -1 || allMerged.indexOf("習慣") !== -1) tags.push("整える習慣");
    if (allMerged.indexOf("手放") !== -1 || allMerged.indexOf("軽く") !== -1) tags.push("手放しと再生");
    if (!tags.length) tags.push("自己理解の深化");
    if (themes) themes.textContent = tags.join(" / ");

    if (next) {
      var nextBase = "次の7日間は「" + tags[0] + "」をテーマに整えていきましょう。";
      var nextShuku = shukuNextSevenSuggestion(profile.shuku, typeKey);
      next.textContent = nextBase + " " + nextShuku + " 小さな積み重ねが、運気の巡りを安定させます。";
    }
  }

  function setupMoonItemSample() {
    var root = document.querySelector("[data-moon-item-sample]");
    if (!root) return;
    var photoInput = document.querySelector("[data-moon-item-photo]");
    var preview = document.querySelector("[data-moon-item-preview]");
    var note = document.querySelector("[data-moon-item-note]");
    var noteLines = Array.prototype.slice.call(document.querySelectorAll("[data-moon-item-note-line]"));
    var saveButton = document.querySelector("[data-save-moon-item]");
    var status = document.querySelector("[data-moon-item-status]");
    var savedEntry = document.querySelector("[data-moon-item-saved-entry]");
    var savedPhoto = document.querySelector("[data-moon-item-saved-photo]");
    var savedDate = document.querySelector("[data-moon-item-saved-date]");
    var photoKey = STORAGE_PREFIX + "moon_item_chopsticks_photo";
    var noteKey = STORAGE_PREFIX + "moon_item_chopsticks_note";

    function stripLinePrefix(value) {
      return (value || "").replace(/^\s*[1-4][\.\-:：、\s]*/, "").trim();
    }

    function splitNoteIntoLines(text) {
      var rows = (text || "").replace(/\r/g, "").split("\n")
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return line !== ""; })
        .map(stripLinePrefix);
      if (rows.length > 4) {
        rows = rows.slice(0, 3).concat([rows.slice(3).join(" ")]);
      }
      while (rows.length < 4) rows.push("");
      return rows;
    }

    function composeNoteText() {
      if (!noteLines.length) {
        return note ? note.value || "" : "";
      }
      var lines = noteLines.map(function (field) {
        return (field.value || "").trim();
      });
      var numbered = [];
      for (var i = 0; i < lines.length; i++) {
        if (lines[i]) numbered.push((i + 1) + " " + lines[i]);
      }
      return numbered.join("\n");
    }

    function syncNoteMirror() {
      if (note) note.value = composeNoteText();
    }

    function renderMoonItem() {
      var image = localStorage.getItem(photoKey) || "";
      var text = (localStorage.getItem(noteKey) || "").trim();
      var date = localStorage.getItem(noteKey + "_savedAt") || "";
      if (preview) {
        preview.innerHTML = image ? '<img src="' + image + '" alt="今日の月読みアイテム お箸">' : '<span>お箸の写真を選ぶと、ここに表示されます。</span>';
      }
      if (savedPhoto) {
        savedPhoto.innerHTML = image ? '<img src="' + image + '" alt="保存したお箸の写真">' : '<span>写真はまだ保存されていません。</span>';
      }
      if (savedEntry) {
        savedEntry.innerHTML = text ? escapeHtml(text) : '<span class="manual-empty">まだ記録がありません。お箸を見て感じたことを書くと、ここに残ります。</span>';
      }
      if (savedDate) {
        savedDate.textContent = text || image ? "保存日：" + new Date(date || new Date().toISOString()).toLocaleString("ja-JP") : "保存すると、ここに日付が残ります";
      }
    }

    function saveImage(file) {
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var image = new Image();
        image.onload = function () {
          var canvas = document.createElement("canvas");
          var max = 900;
          var scale = Math.min(1, max / Math.max(image.width, image.height));
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          var ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          localStorage.setItem(photoKey, canvas.toDataURL("image/jpeg", .78));
          renderMoonItem();
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    }

    var storedNote = localStorage.getItem(noteKey) || "";
    if (note) note.value = storedNote;
    if (noteLines.length) {
      var initialRows = splitNoteIntoLines(storedNote);
      noteLines.forEach(function (field, index) {
        field.value = initialRows[index] || "";
        field.addEventListener("input", syncNoteMirror);
      });
      syncNoteMirror();
    }
    if (photoInput) {
      photoInput.addEventListener("change", function () {
        saveImage(photoInput.files && photoInput.files[0]);
      });
    }
    if (saveButton) {
      saveButton.addEventListener("click", function () {
        var noteText = composeNoteText();
        if (note) note.value = noteText;
        localStorage.setItem(noteKey, noteText);
        localStorage.setItem(noteKey + "_savedAt", new Date().toISOString());
        syncToSheet("item_sample", {
          item: "お箸",
          note: noteText || "",
          hasPhoto: !!(localStorage.getItem(photoKey) || "")
        });
        renderMoonItem();
        if (status) {
          status.textContent = "月読みアイテム日記に保存しました。";
          window.setTimeout(function () {
            status.textContent = "";
          }, 2600);
        }
      });
    }
    renderMoonItem();
  }

  function setupSheetSyncSetup() {
    var root = document.querySelector("[data-sheet-sync-setup]");
    if (!root) return;
    var input = root.querySelector("[data-sheet-webhook-input]");
    var secretInput = root.querySelector("[data-sheet-secret-input]");
    var nameInput = root.querySelector("[data-sheet-name-input]");
    var emailInput = root.querySelector("[data-sheet-email-input]");
    var birthInput = root.querySelector("[data-sheet-birth-input]");
    var zodiacInput = root.querySelector("[data-sheet-zodiac-input]");
    var shukuInput = root.querySelector("[data-sheet-shuku-input]");
    var saveBtn = root.querySelector("[data-sheet-webhook-save]");
    var testBtn = root.querySelector("[data-sheet-webhook-test]");
    var clearBtn = root.querySelector("[data-sheet-webhook-clear]");
    var status = root.querySelector("[data-sheet-webhook-status]");
    if (!input || !secretInput) return;
    input.value = getSheetWebhookUrl();
    secretInput.value = getSheetSecretKey();
    var profile = getSheetProfile();
    if (nameInput) nameInput.value = profile.name || "";
    if (emailInput) emailInput.value = profile.email || "";
    if (birthInput) birthInput.value = profile.birth || "";
    if (zodiacInput) zodiacInput.value = profile.zodiac || "";
    if (shukuInput) shukuInput.value = profile.shuku || "";

    function showStatus(message) {
      if (!status) return;
      status.textContent = message || "";
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        setSheetWebhookUrl(input.value || "");
        setSheetSecretKey(secretInput.value || "");
        setSheetProfile({
          name: nameInput ? (nameInput.value || "").trim() : "",
          email: emailInput ? (emailInput.value || "").trim() : "",
          birth: birthInput ? (birthInput.value || "").trim() : "",
          zodiac: zodiacInput ? (zodiacInput.value || "").trim() : "",
          shuku: shukuInput ? (shukuInput.value || "").trim() : ""
        });
        showStatus("保存しました。URLと秘密キーが一致したときだけ送信されます。");
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        setSheetWebhookUrl("");
        setSheetSecretKey("");
        setSheetProfile({});
        input.value = "";
        secretInput.value = "";
        if (nameInput) nameInput.value = "";
        if (emailInput) emailInput.value = "";
        if (birthInput) birthInput.value = "";
        if (zodiacInput) zodiacInput.value = "";
        if (shukuInput) shukuInput.value = "";
        showStatus("連携URLを解除しました。");
      });
    }

    if (testBtn) {
      testBtn.addEventListener("click", function () {
        showStatus("接続テスト送信中です...");
        syncToSheet("connection_test", { message: "sheet connection test" }).then(function (result) {
          if (result && result.ok) {
            showStatus("テスト送信しました。5〜10秒後にシート側で受信を確認してください。");
          } else if (result && result.skipped) {
            if (result.reason === "secret_missing") {
              showStatus("秘密キー未設定です。URLと秘密キーを保存してください。");
            } else {
              showStatus("URL未設定です。先にWebhook URLを保存してください。");
            }
          } else {
            showStatus("送信に失敗しました。URL設定と公開設定を確認してください。");
          }
        });
      });
    }
  }

  function setupChallengeOpenLock() {
    var openAt = new Date(2026, 5, 15, 0, 0, 0);
    var isOpen = new Date() >= openAt;
    var pageName = window.location.pathname.split("/").pop() || "";
    if (!isOpen && /^challenge_day[1-7]\.html$/.test(pageName)) {
      window.location.replace("my_manual_修正版.html" + window.location.search);
      return;
    }
    var startLinks = Array.prototype.slice.call(document.querySelectorAll("[data-start-locked]"));
    if (!startLinks.length) return;
    startLinks.forEach(function (link) {
      if (isOpen) return;
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("data-locked-message", "true");
      link.style.opacity = ".62";
      link.style.cursor = "not-allowed";
      link.textContent = "6月15日（月）双子座新月にひらきます";
      link.addEventListener("click", function (event) {
        event.preventDefault();
        alert("7日間の月読み日記は、2026年6月15日（月）双子座新月からひらきます。はじめにを読みながら、静かに準備していてください。");
      });
    });
  }

  function setupDiaryHowto() {
    var panels = Array.prototype.slice.call(document.querySelectorAll(".diary-panel"));
    panels.forEach(function (panel) {
      if (panel.querySelector("[data-diary-howto]")) return;
      if (!panel.querySelector("[data-save-diary], [data-save-moon-diary-book]")) return;

      var itemGuide = document.createElement("details");
      itemGuide.className = "diary-howto diary-item-guide";
      itemGuide.setAttribute("data-diary-item-guide", "true");
      itemGuide.innerHTML =
        '<summary>整えアイテムとは？</summary>' +
        '<div class="diary-howto-body">' +
          '<p>整えアイテムは、今いる場所でふと目に入った日用品です。普段は何気なく使っているものを写真に撮り、1分だけ「どんな役割で私を支えているか」を感じ直します。</p>' +
          '<p>そのものの恩恵に気づくほど、今日の私を整える小さなパワーアイテムになります。</p>' +
        '</div>';

      var guide = document.createElement("details");
      guide.className = "diary-howto";
      guide.setAttribute("data-diary-howto", "true");
      guide.innerHTML =
        '<summary>スマホでの書き方を見る</summary>' +
        '<div class="diary-howto-body">' +
          '<ol>' +
            '<li><strong>写真を選ぶ</strong><span>写真ボタンがある日は、写メを選ぶと下に表示されます。写真なしでも進めます。</span></li>' +
            '<li><strong>白い欄を押して書く</strong><span>全部を書かなくても大丈夫です。1行だけでも、今の気づきとして残せます。</span></li>' +
            '<li><strong>日記を保存する</strong><span>書けたら「日記を保存する」を押します。</span></li>' +
            '<li><strong>保存メッセージを見る</strong><span>保存できると、ボタンの近くに保存のお知らせが出ます。</span></li>' +
          '</ol>' +
          '<p>途中で画面を閉じても、また同じリンクから戻って続けられます。</p>' +
        '</div>';

      var firstHint = panel.querySelector(".diary-hint");
      if (firstHint && firstHint.parentNode === panel) {
        firstHint.insertAdjacentElement("afterend", itemGuide);
        itemGuide.insertAdjacentElement("afterend", guide);
      } else {
        panel.insertBefore(guide, panel.firstChild);
        panel.insertBefore(itemGuide, guide);
      }
    });
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br>");
  }

  window.TsukiyomiWonderland = {
    storageKey: storageKey,
    getSheetWebhookUrl: getSheetWebhookUrl,
    setSheetWebhookUrl: setSheetWebhookUrl,
    getSheetSecretKey: getSheetSecretKey,
    setSheetSecretKey: setSheetSecretKey,
    getSheetProfile: getSheetProfile,
    setSheetProfile: setSheetProfile,
    syncToSheet: syncToSheet,
    saveDay: function (day, value) {
      localStorage.setItem(storageKey(day), value || "");
      localStorage.setItem(storageKey(day) + "_savedAt", new Date().toISOString());
    },
    loadDay: function (day) {
      return localStorage.getItem(storageKey(day)) || "";
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    personalizeGate();
    document.querySelectorAll("[data-keep-query]").forEach(keepQuery);
    setupDiary();
    setupManual();
    setupThemeSelect();
    setupZodiacChapter();
    setupZodiacComplete();
    setupMoonDiaryBook();
    setupMoonItemSample();
    setupMoonItemOracle();
    setupChallengeCalendar();
    setupYearJourney();
    setupYearChapter();
    setupDeepReport();
    setupSheetSyncSetup();
    setupChallengeOpenLock();
    setupDiaryHowto();
  });
})();
