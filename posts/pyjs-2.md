## 0x001 细节一：增强赋值与算术运算对可变对象的影响

在Python中，`+=`（增强赋值）对可变对象执行的是“原地修改”，而 算术运算符`+` 运算会创建新对象。

```python
# 增强赋值
# 增强赋值在条件符合的情况下（如：操作数是一个可变数据）会以inplace的方式来进行处理，而普通赋值则会以新建的方式进行处理。
lst1 = [1, 2]
lst2 = [3, 4, 5]
print('当前lst1的id是',id(lst1))
print('当前lst1的内容',lst1)
lst1 += lst2
print('当前lst1的id是',id(lst1))
print('当前lst1的内容',lst1)
lst1 = [1, 2]
lst2 = [3, 4, 5]
print('当前lst1的id是',id(lst1))
print('当前lst1的内容',lst1)
lst1 = lst1 + lst2
print('当前lst1的id是',id(lst1))
print('当前lst1的内容',lst1)
```

可以得出结果：

![image.png](Python%E6%8A%80%E6%9C%AF%E7%AF%87(%E4%BA%8C)%EF%BC%9APython%E4%B8%AD%E7%9A%84%E4%B8%80%E4%BA%9B%E9%9A%90%E8%97%8F%E7%BB%86%E8%8A%82/image.png)

可以发现，正如上文所说。

## 0x002 细节二：Python中的成员运算关系

在 Python 中：

```python
True == 1   # True
False == 0  # True
```

并且 `True` 和 `False` 都是 `int` 的子类：

那么就有：

```python
d = {1: 2, 0: 4}
print(True in d)
print(False in d)

isinstance(True, int)  # True
isinstance(False, int) # True

```

结果显而易见，都是True。

Python 会把键 1 和 True 当成同一个 key（都 hash 成整数 1）。
同样，键 0 和 False 也当成同一个 key（hash 成整数 0）。

如何验证，也很简单：

```python
d = {True: "A", 1: "B"}
print(d)
```

这种情况下打印一下d就可以得出：

```python
{True: 'B'}
```

因为被覆盖了，这也间接证明了它们是同一个 key。

## 0x003 细节三：Python数字缓存

Python中会将一些数字提前缓存，可以通过身份运算符 is 来判定

```python
a = 256
b = 256
print(a == b)
print(a is b)
a = 257
b = 257
print(a == b)
print(a is b)
```

## 0x004 Range等距采样

```python
print(list(range(4))) # [0, 1, 2, 3]
print(list(range(1, 5))) # [1, 2, 3, 4]
print(list(range(1, 8, 2))) # [1, 3, 5, 7]
print(list(range(8, 1, -2))) # [8, 6, 4, 2]
rg = range(1, 8, 2)
print(len(rg)) # 4
print(rg[2]) # 5
print(rg[::2]) # range(1, 9, 4)
```

这是最关键也最巧妙的地方。`range`对象非常智能，当它遇到一个**等距采样**的切片操作时（比如从一个等差数列中再按固定间隔取元素），它不会真的生成一个包含 `[1, 5]`的临时列表，而是会**计算出一个新的、等价的 `range`对象**。

## 0x005 函数传参位置参数与关键字参数顺序问题

```python
def modern_func(a, b, /, c, d, *, e, f):
    """
    a, b: 只能按位置传递
    c, d: 可以按位置或关键字传递  
    e, f: 只能按关键字传递
    """
    return a + b + c + d + e + f

# 调用示例
modern_func(1, 2, 3, d=4, e=5, f=6)    # ✅ 正确
modern_func(1, 2, c=3, d=4, e=5, f=6)  # ✅ 正确
# modern_func(a=1, b=2, 3, 4, e=5, f=6) # ❌ 错误：位置参数在关键字参数后
```

## 0x006 科学文本输出格式化

 e+bb 表示的是 10的多少次幂

0x007 IEEE 754 浮点数

python中（Numpy数据处理的时候）经常将缺失值Nan视为浮点数数据类型