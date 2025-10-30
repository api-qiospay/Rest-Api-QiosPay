function convertToCommonJS(code) {
  return code
    .replace(/import\s+(.+?)\s+from\s+['"](.+?)['"]/g, (match, what, from) => {
      if (what.includes("{")) {
        return `const ${what.replace(/[{}]/g, "").trim()} = require("${from}");`;
      } else {
        return `const ${what.trim()} = require("${from}");`;
      }
    })
    .replace(/export\s+default\s+/, "module.exports = ")
    .replace(/export\s+\{([^}]+)\};?/g, (_, exports) => {
      return `module.exports = { ${exports.trim()} };`;
    });
}

function convertToESModule(code) {
  return code
    .replace(/const\s+(.+?)\s+=\s+require\(['"](.+?)['"]\);?/g, (match, what, from) => {
      return `import ${what.trim()} from "${from}";`;
    })
    .replace(/module\.exports\s+=\s+/, "export default ")
    .replace(/module\.exports\s+=\s+\{([^}]+)\};?/g, (_, exports) => {
      return `export { ${exports.trim()} };`;
    });
}

module.exports = [
  {
    name: "Convert ESM to CJS",
    desc: "Convert ESModule ke CommonJS",
    category: "Tools",
    path: "/tools/convert/esm-to-cjs?code=",

    async run(req, res) {
      const { code } = req.query;
      if (!code) return res.json({ status: false, error: "Wajib isi 'code'" });

      try {
        const converted = convertToCommonJS(code);
        res.json({ status: true, type: "esm-to-cjs", result: converted });
      } catch (err) {
        res.status(500).json({ status: false, error: err.message });
      }
    },
  },
  {
    name: "Convert CJS to ESM",
    desc: "Convert CommonJS ke ESModule",
    category: "Tools",
    path: "/tools/convert/cjs-to-esm?code=",

    async run(req, res) {
      const { code } = req.query;
      if (!code) return res.json({ status: false, error: "Wajib isi 'code'" });

      try {
        const converted = convertToESModule(code);
        res.json({ status: true, type: "cjs-to-esm", result: converted });
      } catch (err) {
        res.status(500).json({ status: false, error: err.message });
      }
    },
  },
];
