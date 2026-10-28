// --- Constantes de domínio (substituem números e strings mágicas) ---
export const ReportType = Object.freeze({ CSV: 'CSV', HTML: 'HTML' });
export const Role = Object.freeze({ ADMIN: 'ADMIN', USER: 'USER' });

const PRIORITY_VALUE_THRESHOLD = 1000; // acima disso, o item é prioritário para admins
const USER_MAX_VISIBLE_VALUE = 500; // users comuns só veem itens até este valor

// --- Formatos de saída (Replace Conditional with Polymorphism) ---
// Cada formato sabe montar seu cabeçalho, suas linhas e seu rodapé.

class CsvFormatter {
  header() {
    return 'ID,NOME,VALOR,USUARIO\n';
  }

  row(item, user) {
    return `${item.id},${item.name},${item.value},${user.name}\n`;
  }

  footer(total) {
    return `\nTotal,,\n${total},,\n`;
  }
}

class HtmlFormatter {
  header(user) {
    return (
      '<html><body>\n' +
      '<h1>Relatório</h1>\n' +
      `<h2>Usuário: ${user.name}</h2>\n` +
      '<table>\n' +
      '<tr><th>ID</th><th>Nome</th><th>Valor</th></tr>\n'
    );
  }

  row(item, _user, highlighted) {
    const style = highlighted ? ' style="font-weight:bold;"' : '';
    return `<tr${style}><td>${item.id}</td><td>${item.name}</td><td>${item.value}</td></tr>\n`;
  }

  footer(total) {
    return '</table>\n' + `<h3>Total: ${total}</h3>\n` + '</body></html>\n';
  }
}

// Special Case: tipo de relatório desconhecido gera relatório vazio (mesmo comportamento do original).
class EmptyFormatter {
  header() {
    return '';
  }

  row() {
    return '';
  }

  footer() {
    return '';
  }
}

const FORMATTERS = Object.freeze({
  [ReportType.CSV]: new CsvFormatter(),
  [ReportType.HTML]: new HtmlFormatter(),
});
const EMPTY_FORMATTER = new EmptyFormatter();

// --- Regras de visibilidade por papel (Replace Conditional with Polymorphism) ---
// Cada papel decide quais itens vê e quais são destacados.

const adminPolicy = Object.freeze({
  canView: () => true,
  isHighlighted: (item) => Boolean(item.priority) || item.value > PRIORITY_VALUE_THRESHOLD,
});

const userPolicy = Object.freeze({
  canView: (item) => item.value <= USER_MAX_VISIBLE_VALUE,
  isHighlighted: () => false,
});

// Special Case: papel desconhecido não vê nenhum item (mesmo comportamento do original).
const noAccessPolicy = Object.freeze({
  canView: () => false,
  isHighlighted: () => false,
});

const POLICIES = Object.freeze({
  [Role.ADMIN]: adminPolicy,
  [Role.USER]: userPolicy,
});

const sumValues = (items) => items.reduce((total, item) => total + item.value, 0);

export class ReportGenerator {
  constructor(database) {
    this.db = database;
  }

  /**
   * Gera um relatório de itens baseado no tipo e no usuário.
   * - Admins veem tudo (itens acima de 1000 aparecem em destaque no HTML).
   * - Users comuns só veem itens com valor <= 500.
   */
  generateReport(reportType, user, items) {
    const formatter = FORMATTERS[reportType] ?? EMPTY_FORMATTER;
    const policy = POLICIES[user.role] ?? noAccessPolicy;

    const visibleItems = items.filter((item) => policy.canView(item));
    const rows = visibleItems.map((item) => formatter.row(item, user, policy.isHighlighted(item)));

    const report = formatter.header(user) + rows.join('') + formatter.footer(sumValues(visibleItems));
    return report.trim();
  }
}
