import { router } from '@kit.ArkUI'

@Entry
@Component
struct Index {
  @State message: string = 'Hello World'
  @State count: number = 0

  build() {
    Column() {
      Text(this.message)
        .fontSize(50)
        .fontWeight(FontWeight.Bold)
      
      Button('Click me')
        .onClick(() => {
          this.count++
        })
        .margin(10)
      
      if (this.count > 0) {
        Text(`Count: ${this.count}`)
          .fontSize(30)
      }
      
      ForEach(this.items, (item: string) => {
        ListItem() {
          Text(item)
        }
      })
    }
    .width('100%')
    .height('100%')
  }
  
  @Builder
  MyBuilder(text: string) {
    Text(text)
      .fontSize(20)
  }
}

@Observed
class MyModel {
  public name: string = ''
  private _value: number = 0
  
  constructor(name: string) {
    this.name = name
  }
  
  getValue(): number {
    return this._value
  }
  
  setValue(value: number): void {
    this._value = value
  }
}
