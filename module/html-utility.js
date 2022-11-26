export class HtmlUtility{
  static _showControlWhen(control, condition) {
    if (condition) {
      control.show();
    }
    else {
      control.hide();
    }
  }
}