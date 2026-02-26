#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

console.log('🔧 启动通用补丁引擎...\n');

/**
 * 助手函数：安全修改文件
 */
function patchFile(filePath, label, patches) {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  跳过 ${label}: 找不到文件 ${path.relative(PROJECT_ROOT, filePath)}`);
        return;
    }

    console.log(`🔍 处理 ${label}...`);
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    patches.forEach(patch => {
        const { name, check, pattern, replacement } = patch;
        process.stdout.write(`   ⁃ ${name}: `);

        if (content.includes(check)) {
            console.log('✓ 已存在');
        } else {
            if (content.match(pattern)) {
                content = content.replace(pattern, replacement);
                modified = true;
                console.log('✅ 已应用');
            } else {
                console.log('❌ 未找到匹配锚点');
            }
        }
    });

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8');
    }
    console.log('');
}

// ===== 1. 企业版许可证补丁 =====
patchFile(
    path.join(PROJECT_ROOT, 'packages/cli/src/license.ts'),
    'Enterprise License',
    [
        {
            name: 'init() 详细功能提示',
            check: 'N8N ENTERPRISE FEATURES ENABLED',
            pattern: /(}: \{ forceRecreate\?: boolean; isCli\?: boolean \} = \{\}\) \{)\n(\t\t)(if \(this\.manager)/,
            replacement: `$1
$2// 支持通过环境变量启用企业版功能
$2if (process.env.N8N_ENTERPRISE === 'true') {
$2\tthis.logger.info('');
$2\tthis.logger.info('╔═══════════════════════════════════════════════════════════╗');
$2\tthis.logger.info('║  🎉 N8N ENTERPRISE FEATURES ENABLED                      ║');
$2\tthis.logger.info('║                                                           ║');
$2\tthis.logger.info('║  All enterprise features are now available:              ║');
$2\tthis.logger.info('║  ✓ LDAP & SAML Authentication                            ║');
$2\tthis.logger.info('║  ✓ Source Control (Git)                                  ║');
$2\tthis.logger.info('║  ✓ External Secrets Management                           ║');
$2\tthis.logger.info('║  ✓ Advanced Permissions & Roles                          ║');
$2\tthis.logger.info('║  ✓ Log Streaming                                         ║');
$2\tthis.logger.info('║  ✓ Unlimited Users, Triggers & Variables                 ║');
$2\tthis.logger.info('║  ✓ AI Assistant & AI Credits                             ║');
$2\tthis.logger.info('║  ✓ And much more...                                      ║');
$2\tthis.logger.info('║                                                           ║');
$2\tthis.logger.info('║  Environment: N8N_ENTERPRISE=true                        ║');
$2\tthis.logger.info('╚═══════════════════════════════════════════════════════════╝');
$2\tthis.logger.info('');
$2\treturn;
$2}

$2$3`
        },
        {
            name: 'isLicensed() 逻辑绕过',
            check: "feature === 'feat:showNonProdBanner'",
            pattern: /(\tisLicensed\(feature: BooleanLicenseFeature\) \{)\n(\t\t)(return this\.manager)/,
            replacement: `$1
$2// 支持通过环境变量启用企业版功能
$2if (process.env.N8N_ENTERPRISE === 'true') {
$2\t// SHOW_NON_PROD_BANNER 是反向逻辑特性，需要返回 false 来隐藏横幅
$2\tif (feature === 'feat:showNonProdBanner') {
$2\t\treturn false;
$2\t}
$2\t// API_DISABLED 是反向逻辑特性，需要返回 false 来启用 API
$2\tif (feature === 'feat:apiDisabled') {
$2\t\treturn false;
$2\t}
$2\treturn true;
$2}
$2$3`
        },
        {
            name: 'getValue() 配额绕过',
            check: "feature.toString().startsWith('quota:')",
            pattern: /(\tgetValue<T extends keyof FeatureReturnType>\(feature: T\): FeatureReturnType\[T\] \{)\n(\t\t)(return this\.manager)/,
            replacement: `$1
$2// 支持通过环境变量启用企业版功能
$2if (process.env.N8N_ENTERPRISE === 'true') {
$2\t// 对于配额相关的特性，返回无限配额
$2\tif (feature.toString().startsWith('quota:')) {
$2\t\treturn UNLIMITED_LICENSE_QUOTA as FeatureReturnType[T];
$2\t}
$2\t// 对于 planName，返回 'Enterprise'
$2\tif (feature === 'planName') {
$2\t\treturn 'Enterprise' as FeatureReturnType[T];
$2\t}
$2}
$2$3`
        }
    ]
);

// ===== 2. i18n 核心补丁 =====
patchFile(
    path.join(PROJECT_ROOT, 'packages/frontend/@n8n/i18n/src/index.ts'),
    'i18n Core',
    [
        {
            name: 'setLanguage() 缓存清理',
            check: '\n\ti18n.clearCache();',
            pattern: /(i18nInstance\.global\.locale\.value = locale(?: as (?:any|'en'))?;\n[\t\s]+document\.querySelector\('html'\)!\.setAttribute\('lang', locale\);\n\n[\t\s]+\/\/ Invalidate cached baseText results on locale change)\n[\t\s]+\/\/ i18n\.clearCache\(\);/,
            replacement: `$1\n\ti18n.clearCache();`
        }
    ]
);

// ===== 3. Stores 语言持久化补丁 =====
patchFile(
    path.join(PROJECT_ROOT, 'packages/frontend/@n8n/stores/src/constants.ts'),
    'Stores Constants',
    [
        {
            name: '本地存储 Key 常量',
            check: 'LOCAL_STORAGE_USER_LANGUAGE',
            pattern: /(\} as const;)/,
            replacement: `$1\n\nexport const LOCAL_STORAGE_USER_LANGUAGE = 'n8n-user-language';`
        }
    ]
);

patchFile(
    path.join(PROJECT_ROOT, 'packages/frontend/@n8n/stores/src/useRootStore.ts'),
    'Stores Persistence',
    [
        {
            name: '导入常量',
            check: 'LOCAL_STORAGE_USER_LANGUAGE',
            pattern: /import \{ STORES \} from '\.\/constants';/,
            replacement: "import { STORES, LOCAL_STORAGE_USER_LANGUAGE } from './constants';"
        },
        {
            name: 'defaultLocale 初始化',
            check: 'localStorage.getItem(LOCAL_STORAGE_USER_LANGUAGE)',
            pattern: /defaultLocale: 'en',/,
            replacement: "defaultLocale: localStorage.getItem(LOCAL_STORAGE_USER_LANGUAGE) ?? 'en',"
        }
    ]
);

// ===== 4. App.vue 动态加载补丁 =====
patchFile(
    path.join(PROJECT_ROOT, 'packages/frontend/editor-ui/src/app/App.vue'),
    'App.vue Core',
    [
        {
            name: '导入 loadLanguage',
            check: 'import { loadLanguage, setLanguage }',
            pattern: /import \{ setLanguage \} from '@n8n\/i18n';/,
            replacement: "import { loadLanguage, setLanguage } from '@n8n/i18n';"
        },
        {
            name: 'defaultLocale 计算属性',
            check: "localStorage.getItem('n8n-user-language')",
            pattern: /const defaultLocale = computed\(\(\) => rootStore\.defaultLocale\);/,
            replacement: `const defaultLocale = computed(() => {
	const savedLanguage = localStorage.getItem('n8n-user-language');
	return savedLanguage || rootStore.defaultLocale;
});`
        },
        {
            name: 'onMounted 初始化语言',
            check: '// 初始化语言设置',
            pattern: /(onMounted\(async \(\) => \{\n\tsetAppZIndexes\(\);\n\tlogHiringBanner\(\);)/,
            replacement: `$1

\t// 初始化语言设置
\tconst savedLanguage = localStorage.getItem('n8n-user-language');
\tif (savedLanguage && savedLanguage !== 'en') {
\t\ttry {
\t\t\tconst messages = await import(\`@n8n/i18n/locales/\${savedLanguage}.json\`);
\t\t\tloadLanguage(savedLanguage, messages.default);
\t\t} catch (error) {
\t\t\tconsole.warn('Failed to load saved language:', error);
\t\t\tlocalStorage.removeItem('n8n-user-language');
\t\t}
\t}`
        },
        {
            name: 'watch 动态加载逻辑',
            check: '// 动态加载语言文件',
            pattern: /watch\(\n\tdefaultLocale,\n\tasync \(newLocale\) => \{\n\t\tsetLanguage\(newLocale\);/,
            replacement: `watch(
	defaultLocale,
	async (newLocale) => {
		// 动态加载语言文件
		if (newLocale !== 'en') {
			try {
				const messages = await import(\`@n8n/i18n/locales/\${newLocale}.json\`);
				loadLanguage(newLocale, messages.default);
			} catch (error) {
				console.warn(\`Failed to load locale \${newLocale}:\`, error);
				setLanguage('en');
				return;
			}
		} else {
			setLanguage(newLocale);
		}`
        }
    ]
);

// ===== 5. SettingsPersonalView.vue UI 面板 =====
patchFile(
    path.join(PROJECT_ROOT, 'packages/frontend/editor-ui/src/features/core/auth/views/SettingsPersonalView.vue'),
    'Settings UI',
    [
        {
            name: '脚本依赖注入 (i18n & Store)',
            check: 'loadLanguage',
            pattern: /import \{ useI18n \} from '@n8n\/i18n';/,
            replacement: "import { useI18n, loadLanguage } from '@n8n/i18n';"
        },
        {
            name: 'Store 依赖注入',
            check: "import { LOCAL_STORAGE_USER_LANGUAGE } from '@n8n/stores/constants';",
            pattern: /import \{ useSSOStore \} from '@\s?\/features\/settings\/sso\/sso\.store';/,
            replacement: `import { useSSOStore } from '@/features/settings/sso/sso.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { LOCAL_STORAGE_USER_LANGUAGE } from '@n8n/stores/constants';`
        },
        {
            name: 'rootStore 实例初始化',
            check: 'const rootStore = useRootStore();',
            pattern: /const documentTitle = useDocumentTitle\(\);/,
            replacement: `const documentTitle = useDocumentTitle();
const rootStore = useRootStore();`
        },
        {
            name: '语言选择状态',
            check: 'currentSelectedLanguage',
            pattern: /const currentSelectedTheme = ref\(useUIStore\(\)\.theme\);/,
            replacement: `const currentSelectedTheme = ref(useUIStore().theme);

// 添加语言相关状态
const currentSelectedLanguage = ref(
	localStorage.getItem(LOCAL_STORAGE_USER_LANGUAGE) || rootStore.defaultLocale,
);
const hasAnyLanguageChanges = ref(false);

const languageOptions = ref([
	{ name: 'en', label: 'English' },
	{ name: 'zh-CN', label: '中文' },
]);`
        },
        {
            name: 'hasAnyPersonalisationChanges 逻辑',
            check: 'hasAnyLanguageChanges.value',
            pattern: /return currentSelectedTheme\.value !== uiStore\.theme;/,
            replacement: `return currentSelectedTheme.value !== uiStore.theme || hasAnyLanguageChanges.value;`
        },
        {
            name: 'saveUserSettings 逻辑注入',
            check: '// 处理语言变化',
            pattern: /uiStore\.setTheme\(currentSelectedTheme\.value\);/,
            replacement: `uiStore.setTheme(currentSelectedTheme.value);

\t// 处理语言变化
\tif (hasAnyLanguageChanges.value) {
\t\ttry {
\t\t\tif (currentSelectedLanguage.value !== 'en') {
\t\t\t\tconst messages = await import(\`@n8n/i18n/locales/\${currentSelectedLanguage.value}.json\`);
\t\t\t\tloadLanguage(currentSelectedLanguage.value, messages.default);
\t\t\t}

\t\t\trootStore.setDefaultLocale(currentSelectedLanguage.value);
\t\t\tlocalStorage.setItem(LOCAL_STORAGE_USER_LANGUAGE, currentSelectedLanguage.value);
\t\t\thasAnyLanguageChanges.value = false;
\t\t} catch (error) {
\t\t\tconsole.error('Failed to load language:', error);
\t\t\tshowError(error, 'Failed to update language');
\t\t}
\t}`
        },
        {
            name: 'Template UI 注入',
            check: 'data-test-id="language-select"',
            pattern: /(<\/div>\n\t\t<\/div>\n)\t\t<div>\n\t\t\t<N8nButton/,
            replacement: `$1
\t\t<!-- 添加语言选择 -->
\t\t<div class="mt-m">
\t\t\t<N8nInputLabel :label="i18n.baseText('settings.personal.language')">
\t\t\t\t<N8nSelect
\t\t\t\t\tv-model="currentSelectedLanguage"
\t\t\t\t\t:class="$style.languageSelect"
\t\t\t\t\tdata-test-id="language-select"
\t\t\t\t\tsize="small"
\t\t\t\t\tfilterable
\t\t\t\t\t@update:model-value="onLanguageChange"
\t\t\t\t>
\t\t\t\t\t<N8nOption
\t\t\t\t\t\tv-for="item in languageOptions"
\t\t\t\t\t\t:key="item.name"
\t\t\t\t\t\t:label="item.label"
\t\t\t\t\t\t:value="item.name"
\t\t\t\t\t>
\t\t\t\t\t</N8nOption>
\t\t\t\t</N8nSelect>
\t\t\t</N8nInputLabel>
\t\t</div>

\t\t<div>
\t\t\t<N8nButton`
        }
    ]
);

// ===== 6. Locales 翻译注入 =====
patchFile(
    path.join(PROJECT_ROOT, 'packages/frontend/@n8n/i18n/src/locales/en.json'),
    'Locales',
    [
        {
            name: '注入语言设置翻译项',
            check: 'settings.personal.language',
            pattern: /("saveButton\.save": "@:_reusableBaseText\.save",)/,
            replacement: `$1
\t"settings.personal.language": "Language",
\t"settings.personal.language.description": "Choose your preferred language",
\t"settings.personal.language.en": "English",
\t"settings.personal.language.zh-CN": "简体中文",`
        }
    ]
);

console.log('✅ 所有通用补丁处理完成！');
